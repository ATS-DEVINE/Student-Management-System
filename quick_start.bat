@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo  Quick Start - Student Management
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is not installed or not in PATH.
    echo Install Node.js 18+ and run this file again.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installing project dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo Starting server at http://localhost:3000 ...
echo.
start "" http://localhost:3000
call npm start
