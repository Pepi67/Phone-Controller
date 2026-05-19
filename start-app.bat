@echo off
title Phone Controller Launcher

cd /d "%~dp0"

echo Starting Phone Controller backend...
start "Phone Controller Backend" cmd /k "npm start"

echo Starting Phone Controller frontend...
start "Phone Controller Frontend" cmd /k "cd client && npm run dev -- --host 0.0.0.0"

echo.
echo App started.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Use the Network IP shown in the frontend window on your phone.
echo Example: http://192.168.0.138:5173
echo.
pause