@echo off
REM =====================================================
REM   FaceLab Gateway - Anaconda Startup Script
REM   Activates 'web' conda environment and runs Gateway
REM =====================================================
setlocal

echo =======================================
echo   FaceLab Gateway (Port 8000)
echo =======================================
echo.

REM Change to gateway directory
cd /d "%~dp0gateway"

REM Activate conda environment
call conda activate web
if errorlevel 1 (
    echo ERROR: Failed to activate 'web' conda environment.
    echo Please create it first: conda env create -f environment_web.yaml
    pause
    exit /b 1
)

echo Starting Gateway on http://localhost:8000 ...
echo Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8000 --reload

pause
