const mysql = require('mysql2/promise');

let pool;

function getEnv(name, fallback) {
    const value = process.env[name];
    return value !== undefined && String(value).trim() !== '' ? value : fallback;
}

function getPool() {
    if (!pool) {
        const isVercel = process.env.VERCEL === '1';
        const host = getEnv('DB_HOST', isVercel ? '' : '127.0.0.1');
        const user = getEnv('DB_USER', isVercel ? '' : 'root');
        const password = getEnv('DB_PASSWORD', isVercel ? '' : '123456');
        const database = getEnv('DB_NAME', isVercel ? '' : 'student_db');
        const port = Number(getEnv('DB_PORT', 3306));

        if (!host || !user || !database) {
            throw new Error(
                'Database configuration is missing. Set DB_HOST, DB_USER, DB_PASSWORD, DB_NAME and DB_PORT. ' +
                'On Vercel, DB_HOST must be your remote MySQL host (not 127.0.0.1).'
            );
        }

        const config = {
            host,
            user,
            password,
            database,
            port,
            waitForConnections: true,
            connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
            queueLimit: 0
        };

        if (String(process.env.DB_SSL || '').toLowerCase() === 'true') {
            config.ssl = { rejectUnauthorized: false };
        }

        pool = mysql.createPool(config);
    }

    return pool;
}

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(statusCode).json(payload);
    }

    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

function toObjectFromParams(params) {
    const parsed = {};
    for (const [key, value] of params.entries()) {
        parsed[key] = value;
    }
    return parsed;
}

function parseBodyString(rawBody) {
    if (!rawBody || !rawBody.trim()) {
        return {};
    }

    try {
        return JSON.parse(rawBody);
    } catch (jsonError) {
        const params = new URLSearchParams(rawBody);
        return toObjectFromParams(params);
    }
}

async function parseRequestBody(req) {
    if (req.body !== undefined) {
        if (typeof req.body === 'object' && req.body !== null) {
            return req.body;
        }
        if (typeof req.body === 'string') {
            return parseBodyString(req.body);
        }
    }

    return new Promise((resolve, reject) => {
        let rawBody = '';

        req.on('data', (chunk) => {
            rawBody += chunk.toString();

            if (rawBody.length > 1_000_000) {
                reject(new Error('Request body is too large'));
            }
        });

        req.on('end', () => {
            try {
                resolve(parseBodyString(rawBody));
            } catch (error) {
                reject(error);
            }
        });

        req.on('error', reject);
    });
}

function normalizeStudent(body) {
    return {
        name: typeof body.name === 'string' ? body.name.trim() : '',
        email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
        course: typeof body.course === 'string' ? body.course.trim() : ''
    };
}

function validateStudent(student) {
    if (!student.name || student.name.length < 2) {
        return 'Name must be at least 2 characters long.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(student.email)) {
        return 'Please provide a valid email address.';
    }

    if (!student.course) {
        return 'Course is required.';
    }

    return null;
}

function getIdFromRequest(urlObject, body) {
    const fromQuery = urlObject.searchParams.get('id');
    const fromBody = body && body.id !== undefined ? String(body.id) : null;
    const raw = fromQuery || fromBody;

    if (!raw) {
        return null;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

async function handleGet(poolRef, urlObject, res) {
    const id = getIdFromRequest(urlObject, {});
    const search = (urlObject.searchParams.get('search') || '').trim();

    if (id) {
        const [rows] = await poolRef.execute(
            'SELECT id, name, email, course, created_at, updated_at FROM students WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return sendJson(res, 404, { success: false, message: 'Student not found.' });
        }

        return sendJson(res, 200, { success: true, data: rows[0] });
    }

    if (search) {
        const like = `%${search}%`;
        const [rows] = await poolRef.execute(
            `SELECT id, name, email, course, created_at, updated_at
             FROM students
             WHERE name LIKE ? OR email LIKE ? OR course LIKE ?
             ORDER BY id DESC`,
            [like, like, like]
        );

        return sendJson(res, 200, { success: true, data: rows, count: rows.length });
    }

    const [rows] = await poolRef.execute(
        'SELECT id, name, email, course, created_at, updated_at FROM students ORDER BY id DESC'
    );

    return sendJson(res, 200, { success: true, data: rows, count: rows.length });
}

async function handlePost(poolRef, req, res) {
    const body = await parseRequestBody(req);
    const student = normalizeStudent(body);
    const validationError = validateStudent(student);

    if (validationError) {
        return sendJson(res, 400, { success: false, message: validationError });
    }

    const [insertResult] = await poolRef.execute(
        'INSERT INTO students (name, email, course) VALUES (?, ?, ?)',
        [student.name, student.email, student.course]
    );

    const [rows] = await poolRef.execute(
        'SELECT id, name, email, course, created_at, updated_at FROM students WHERE id = ?',
        [insertResult.insertId]
    );

    return sendJson(res, 201, {
        success: true,
        message: 'Student added successfully.',
        data: rows[0]
    });
}

async function handlePut(poolRef, req, urlObject, res) {
    const body = await parseRequestBody(req);
    const id = getIdFromRequest(urlObject, body);

    if (!id) {
        return sendJson(res, 400, { success: false, message: 'A valid student id is required for update.' });
    }

    const student = normalizeStudent(body);
    const validationError = validateStudent(student);

    if (validationError) {
        return sendJson(res, 400, { success: false, message: validationError });
    }

    const [result] = await poolRef.execute(
        'UPDATE students SET name = ?, email = ?, course = ? WHERE id = ?',
        [student.name, student.email, student.course, id]
    );

    if (result.affectedRows === 0) {
        return sendJson(res, 404, { success: false, message: 'Student not found.' });
    }

    const [rows] = await poolRef.execute(
        'SELECT id, name, email, course, created_at, updated_at FROM students WHERE id = ?',
        [id]
    );

    return sendJson(res, 200, {
        success: true,
        message: 'Student updated successfully.',
        data: rows[0]
    });
}

async function handleDelete(poolRef, req, urlObject, res) {
    const body = req.method === 'DELETE' ? await parseRequestBody(req) : {};
    const id = getIdFromRequest(urlObject, body);

    if (!id) {
        return sendJson(res, 400, { success: false, message: 'A valid student id is required for delete.' });
    }

    const [result] = await poolRef.execute('DELETE FROM students WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        return sendJson(res, 404, { success: false, message: 'Student not found.' });
    }

    return sendJson(res, 200, { success: true, message: 'Student deleted successfully.' });
}

function mapDatabaseError(error) {
    const errorMessage = error && error.message ? error.message : '';

    if (error && error.code === 'ER_DUP_ENTRY') {
        return { status: 409, message: 'This email already exists. Please use a different email.' };
    }

    if (error && error.code === 'ER_NO_SUCH_TABLE') {
        return {
            status: 500,
            message: 'Students table was not found. Run database/create_database.sql first.'
        };
    }

    if (error && (error.code === 'ECONNREFUSED' || /ECONNREFUSED/i.test(errorMessage))) {
        return {
            status: 500,
            message:
                'Could not connect to MySQL. Vercel cannot use localhost/127.0.0.1. ' +
                'Set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME to your remote MySQL server.'
        };
    }

    return {
        status: 500,
        message: errorMessage || 'Unexpected server error.'
    };
}

async function handleStudentsApi(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }

    const urlObject = new URL(req.url, 'http://localhost');

    try {
        const poolRef = getPool();

        if (req.method === 'GET') {
            return await handleGet(poolRef, urlObject, res);
        }

        if (req.method === 'POST') {
            return await handlePost(poolRef, req, res);
        }

        if (req.method === 'PUT') {
            return await handlePut(poolRef, req, urlObject, res);
        }

        if (req.method === 'DELETE') {
            return await handleDelete(poolRef, req, urlObject, res);
        }

        return sendJson(res, 405, { success: false, message: 'Method not allowed.' });
    } catch (error) {
        console.error('API error:', error);
        const friendly = mapDatabaseError(error);
        return sendJson(res, friendly.status, { success: false, message: friendly.message });
    }
}

module.exports = {
    handleStudentsApi
};
