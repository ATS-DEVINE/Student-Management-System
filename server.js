const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleStudentsApi } = require('./lib/students-handler');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp'
};

function sendJson(res, statusCode, payload) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
}

async function readFile(filePath) {
    return fs.promises.readFile(filePath);
}

async function serveStatic(pathname, res) {
    let targetPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);

    if (!path.extname(targetPath)) {
        targetPath = `${targetPath}.html`;
    }

    const withoutLeadingSlash = targetPath.replace(/^[/\\]+/, '');
    const safeRelativePath = path.normalize(withoutLeadingSlash).replace(/^([.][.][/\\])+/, '');
    const absolutePath = path.join(PUBLIC_DIR, safeRelativePath);

    if (!absolutePath.startsWith(PUBLIC_DIR)) {
        return sendJson(res, 403, { success: false, message: 'Forbidden path.' });
    }

    try {
        const data = await readFile(absolutePath);
        const contentType = MIME_TYPES[path.extname(absolutePath).toLowerCase()] || 'application/octet-stream';

        res.statusCode = 200;
        res.setHeader('Content-Type', contentType);
        res.end(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end('<h1>404 - Page not found</h1>');
            return;
        }

        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end('<h1>500 - Internal server error</h1>');
    }
}

const server = http.createServer(async (req, res) => {
    const urlObject = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (urlObject.pathname === '/api/students') {
        return handleStudentsApi(req, res);
    }

    if (urlObject.pathname.startsWith('/api/')) {
        return sendJson(res, 404, { success: false, message: 'API route not found.' });
    }

    return serveStatic(urlObject.pathname, res);
});

server.listen(PORT, () => {
    console.log('========================================');
    console.log(' Student Management System');
    console.log('========================================');
    console.log(` Local server: http://localhost:${PORT}`);
    console.log(' API endpoint: /api/students');
    console.log('========================================');
});
