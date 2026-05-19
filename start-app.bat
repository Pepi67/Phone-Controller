@echo off
setlocal

title Phone Controller Launcher

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-app.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
    echo.
    echo Launcher exited with an error. Review the message above.
    pause
)

exit /b %EXIT_CODE%
