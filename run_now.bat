@echo off
cd /d "%~dp0"

echo Starting Student Management System...
echo Server will run at: http://localhost:3000
echo.

start "" http://localhost:3000
node server.js

pause
