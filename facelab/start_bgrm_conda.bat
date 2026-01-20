@echo off
REM =====================================================
REM   FaceLab Background Removal - Anaconda Startup Script
REM   Activates 'web' conda environment and runs service
REM =====================================================
setlocal

echo =======================================
echo   FaceLab Background Removal (Port 8002)
echo =======================================
echo.

REM Change to background_removal_service directory
cd /d "%~dp0Service\background_removal_service"

REM Activate conda environment (uses 'web' or create dedicated 'bgrm' env)
call conda activate web
if errorlevel 1 (
    echo ERROR: Failed to activate 'web' conda environment.
    echo Please create it first or install rembg: pip install rembg
    pause
    exit /b 1
)

echo Starting Background Removal Service on http://localhost:8002 ...
echo Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8002 --reload

pause
