const http = require('http');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { URLSearchParams } = require('url');

// Database connection configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'student_db'
};

// Test database connection immediately
async function testDatabaseConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ MySQL Database Connected Successfully!');
        console.log(`📍 Host: ${dbConfig.host}`);
        console.log(`🗄️ Database: ${dbConfig.database}`);
        
        // Check if students table exists and get count
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM students');
        console.log(`👥 Current Students: ${rows[0].count}`);
        
        await connection.end();
        return true;
    } catch (error) {
        console.error('❌ Database Connection Failed:', error.message);
        console.log('💡 Please check:');
        console.log('   - MySQL is running');
        console.log('   - Database "student_db" exists');
        console.log('   - User "root" with password "123456"');
        return false;
    }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const url = req.url;
    const method = req.method;
    
    // API Routes
    if (url.startsWith('/api/')) {
        await handleApiRequest(req, res, url, method);
        return;
    }
    
    // Serve static files
    await serveStaticFile(req, res, url);
});

// Handle API requests
async function handleApiRequest(req, res, url, method) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Parse URL and body
        const parsedUrl = new URL(url, `http://localhost:3000`);
        const pathname = parsedUrl.pathname;
        const searchParams = parsedUrl.searchParams;
        
        res.setHeader('Content-Type', 'application/json');
        
        if (pathname === '/api/add' && method === 'POST') {
            await handleAddStudent(req, res, connection);
        } else if (pathname === '/api/students' && method === 'GET') {
            await handleGetStudents(res, connection, searchParams);
        } else if (pathname === '/api/delete' && method === 'POST') {
            await handleDeleteStudent(req, res, connection);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ success: false, message: 'API endpoint not found' }));
        }
        
        await connection.end();
    } catch (error) {
        console.error('API Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: 'Database error: ' + error.message }));
    }
}

// Add student to database
async function handleAddStudent(req, res, connection) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const params = new URLSearchParams(body);
                const name = params.get('name');
                const email = params.get('email');
                const course = params.get('course');
                
                // Validation
                if (!name || !email || !course) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: 'All fields are required' }));
                    return resolve();
                }
                
                // Check for duplicate email
                const [existing] = await connection.execute('SELECT id FROM students WHERE email = ?', [email]);
                if (existing.length > 0) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: 'Email already exists' }));
                    return resolve();
                }
                
                // Insert student
                await connection.execute('INSERT INTO students (name, email, course) VALUES (?, ?, ?)', [name, email, course]);
                
                console.log(`✅ Student Added: ${name} (${email})`);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Student added to MySQL database successfully!' }));
                resolve();
            } catch (error) {
                console.error('Add Student Error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Failed to add student: ' + error.message }));
                resolve();
            }
        });
    });
}

// Get all students
async function handleGetStudents(res, connection, searchParams) {
    try {
        const [rows] = await connection.execute('SELECT * FROM students ORDER BY id DESC');
        
        console.log(`📋 Sent ${rows.length} students to frontend`);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, students: rows }));
    } catch (error) {
        console.error('Get Students Error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, message: 'Failed to fetch students: ' + error.message }));
    }
}

// Delete student
async function handleDeleteStudent(req, res, connection) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const params = new URLSearchParams(body);
                const id = params.get('id');
                
                if (!id) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ success: false, message: 'Student ID required' }));
                    return resolve();
                }
                
                // Delete student
                const [result] = await connection.execute('DELETE FROM students WHERE id = ?', [id]);
                
                if (result.affectedRows > 0) {
                    console.log(`🗑️ Student Deleted: ID ${id}`);
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, message: 'Student deleted from MySQL database!' }));
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({ success: false, message: 'Student not found' }));
                }
                resolve();
            } catch (error) {
                console.error('Delete Student Error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ success: false, message: 'Failed to delete student: ' + error.message }));
                resolve();
            }
        });
    });
}

// Serve static files
async function serveStaticFile(req, res, url) {
    try {
        let filePath = path.join(__dirname, 'src/main/webapp');
        
        if (url === '/' || url === '') {
            filePath = path.join(filePath, 'mysql_real.html');
        } else {
            filePath = path.join(filePath, url);
        }
        
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath);
        const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif'
        }[ext] || 'text/plain';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    } catch (error) {
        console.error('Static File Error:', error);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1><p>The requested file was not found.</p>');
    }
}

// Start server with database test
async function startServer() {
    console.log('🔍 Testing Database Connection...');
    const dbConnected = await testDatabaseConnection();
    
    if (dbConnected) {
        const PORT = 3000;
        server.listen(PORT, () => {
            console.log('\n🚀 Server Started Successfully!');
            console.log('========================================');
            console.log(`🌐 Server: http://localhost:${PORT}`);
            console.log(`📱 Web App: http://localhost:${PORT}/mysql_real.html`);
            console.log('========================================');
            console.log('✅ Features:');
            console.log('   • Real MySQL database connection');
            console.log('   • Add students to database');
            console.log('   • View students from database');
            console.log('   • Delete students from database');
            console.log('   • Live data synchronization');
            console.log('========================================');
            console.log('📝 Press Ctrl+C to stop server');
        });
    } else {
        console.log('\n❌ Server not started due to database connection issues.');
        console.log('💡 Please fix database connection and restart.');
    }
}

// Start the server
startServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped gracefully.');
    process.exit(0);
});
