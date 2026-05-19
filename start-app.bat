@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Phone Controller Launcher

cd /d "%~dp0"

echo ==========================================
echo        Phone Controller Launcher
echo ==========================================
echo.

REM -------------------------------
REM Check Node.js
REM -------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is not installed or not in PATH.
    echo.
    choice /C YN /M "Do you want to install Node.js LTS now"
    if errorlevel 2 (
        echo.
        echo Cannot start app without Node.js.
        pause
        exit /b 1
    )

    echo.
    echo Trying to install Node.js LTS using winget...
    where winget >nul 2>nul
    if errorlevel 1 (
        echo winget was not found on this PC.
        echo Opening Node.js download page...
        start https://nodejs.org/en/download
        echo.
        echo Install Node.js LTS, then run this script again.
        pause
        exit /b 1
    )

    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

    echo.
    echo Refreshing PATH...
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%AppData%\npm"

    where node >nul 2>nul
    if errorlevel 1 (
        echo.
        echo Node.js was installed, but this terminal cannot see it yet.
        echo Close this window and run start-app.bat again.
        pause
        exit /b 1
    )
)

REM -------------------------------
REM Check npm
REM -------------------------------
where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found.
    echo npm normally comes with Node.js.
    echo Reinstall Node.js LTS from:
    echo https://nodejs.org/en/download
    pause
    exit /b 1
)

echo Node version:
node -v
echo npm version:
npm -v
echo.

REM -------------------------------
REM Check backend package.json
REM -------------------------------
if not exist "package.json" (
    echo ERROR: package.json was not found in the project root.
    echo Make sure this script is inside:
    echo C:\Users\Petar\source\repos\Phone-Controller
    pause
    exit /b 1
)

REM -------------------------------
REM Install backend dependencies if needed
REM -------------------------------
if not exist "node_modules" (
    echo Backend dependencies are not installed.
    choice /C YN /M "Run npm install in the backend folder"
    if errorlevel 2 (
        echo Cannot start backend without dependencies.
        pause
        exit /b 1
    )

    echo.
    echo Installing backend dependencies...
    call npm install

    if errorlevel 1 (
        echo.
        echo Backend npm install failed.
        pause
        exit /b 1
    )
) else (
    echo Backend dependencies found.
)

REM -------------------------------
REM Check client folder
REM -------------------------------
if not exist "client\package.json" (
    echo ERROR: client\package.json was not found.
    echo Make sure the React app exists inside the client folder.
    pause
    exit /b 1
)

REM -------------------------------
REM Install frontend dependencies if needed
REM -------------------------------
if not exist "client\node_modules" (
    echo.
    echo Frontend dependencies are not installed.
    choice /C YN /M "Run npm install in the client folder"
    if errorlevel 2 (
        echo Cannot start frontend without dependencies.
        pause
        exit /b 1
    )

    echo.
    echo Installing frontend dependencies...
    pushd client
    call npm install
    if errorlevel 1 (
        popd
        echo.
        echo Frontend npm install failed.
        pause
        exit /b 1
    )
    popd
) else (
    echo Frontend dependencies found.
)

echo.
echo ==========================================
echo Everything looks ready.
echo Starting Phone Controller...
echo ==========================================
echo.

REM -------------------------------
REM Start backend
REM -------------------------------
start "Phone Controller Backend" cmd /k "cd /d "%~dp0" && npm start"

REM -------------------------------
REM Start frontend
REM -------------------------------
start "Phone Controller Frontend" cmd /k "cd /d "%~dp0client" && npm run dev -- --host 0.0.0.0"

echo Backend starting on:
echo http://localhost:3000
echo.
echo Frontend starting on:
echo http://localhost:5173
echo.
echo On your phone, open the Network URL shown in the frontend window.
echo Example:
echo http://192.168.0.138:5173
echo.
pause