# Student Management System

A clean, MySQL-backed Student Management System with:
- Modern HTML/CSS frontend
- Unified Node.js API (`/api/students`)
- Local server support (`npm start`)
- Vercel serverless deployment support

## What Was Fixed

- Removed inconsistent API usage (`students.php`, localStorage, mixed routes)
- Added one consistent backend endpoint: `/api/students`
- Fixed broken `npm start` by adding a real `server.js`
- Added robust request parsing and validation
- Added clean error handling for DB issues and duplicate emails
- Rebuilt frontend UI with a modern responsive design
- Added edit/update flow directly in `view-students.html`
- Updated `quick_start.bat` to launch the real Node.js API server

## Tech Stack

- Node.js (CommonJS)
- MySQL (`mysql2`)
- HTML/CSS/Vanilla JS
- Vercel serverless functions

## Project Structure

```txt
StudentManagementSystem/
|- api/
|  |- students.js            # Vercel serverless API entrypoint
|- lib/
|  |- students-handler.js    # Shared API logic
|- public/
|  |- index.html
|  |- add-student.html
|  |- view-students.html
|  |- search-students.html
|  |- css/style.css
|  |- js/app.js
|- server.js                 # Local development server
|- vercel.json
|- .env.example
|- database/create_database.sql
```

## Database Setup

1. Make sure MySQL is running.
2. Run:

```bash
mysql -u root -p < database/create_database.sql
```

## Local Run

1. Install dependencies:

```bash
npm install
```

2. Set environment variables (or use defaults in `.env.example` values).

3. Start server:

```bash
npm start
```

Or on Windows:

```bat
quick_start.bat
```

4. Open:

- `http://localhost:3000`
- API: `http://localhost:3000/api/students`

## API Reference

### `GET /api/students`
Returns all students.

### `GET /api/students?search=term`
Searches by name, email, or course.

### `GET /api/students?id=1`
Returns one student by ID.

### `POST /api/students`
Creates student.

```json
{
  "name": "Alex Johnson",
  "email": "alex@example.com",
  "course": "Computer Science"
}
```

### `PUT /api/students?id=1`
Updates student.

### `DELETE /api/students?id=1`
Deletes student.

## Deploy To Vercel

1. Push this project to GitHub.
2. Import project in Vercel.
3. Add environment variables in Vercel Project Settings:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL` (`true` for managed DBs requiring TLS)

4. Deploy.

After deployment:
- Frontend pages load from `public/`
- Backend runs as serverless function from `api/students.js`

## Notes

- For production, use a remote MySQL instance (not `localhost`).
- If you see `Students table was not found`, run the SQL setup script.
- If you see duplicate email errors, use a unique email for each student.
# java-Project
