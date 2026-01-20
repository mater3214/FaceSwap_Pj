@echo off
title FaceLab Startup Script
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    FaceLab Startup Script                    ║
echo ║                  AI Face Swapping Service                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Set the project directory
set PROJECT_DIR=%~dp0

:: Check if Anaconda is installed
where conda >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Conda not found in PATH. Please install Anaconda or add it to PATH.
    pause
    exit /b 1
)

echo [1/4] Starting Gateway Service...
echo.

:: Start Gateway in new terminal
start "FaceLab Gateway" cmd /k "cd /d %PROJECT_DIR%facelab\gateway && conda activate simswap && python app.py"
timeout /t 3 /nobreak >nul

echo [2/4] Starting SimSwap Service...
echo.

:: Start SimSwap Service in new terminal
start "SimSwap Service" cmd /k "cd /d %PROJECT_DIR%facelab\Service\simswap_service && conda activate simswap && python app.py"
timeout /t 5 /nobreak >nul

echo [3/4] Installing Frontend Dependencies (if needed)...
echo.

:: Check if node_modules exists
if not exist "%PROJECT_DIR%frontend\node_modules" (
    echo Installing npm dependencies...
    cd /d %PROJECT_DIR%frontend
    call npm install
)

echo [4/4] Starting Frontend Development Server...
echo.

:: Start Frontend in new terminal
start "FaceLab Frontend" cmd /k "cd /d %PROJECT_DIR%frontend && npm run dev"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    All Services Started!                     ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Gateway:   http://localhost:8000                            ║
echo ║  SimSwap:   http://localhost:5001                            ║
echo ║  Frontend:  http://localhost:5173                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Press any key to exit this window...
echo (Note: Services will continue running in their own windows)
pause >nul
