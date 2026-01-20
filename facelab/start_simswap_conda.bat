@echo off
REM =====================================================
REM   FaceLab SimSwap Service - Anaconda Startup Script
REM   Activates 'simswap' conda environment and runs service
REM =====================================================
setlocal

echo =======================================
echo   FaceLab SimSwap Service (Port 8001)
echo =======================================
echo.

REM Change to simswap_service directory
cd /d "%~dp0Service\simswap_service"

REM Activate conda environment
call conda activate simswap
if errorlevel 1 (
    echo ERROR: Failed to activate 'simswap' conda environment.
    echo Please create it first: conda env create -f environment_simswap.yaml
    pause
    exit /b 1
)

echo Starting SimSwap Service on http://localhost:8001 ...
echo Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8001 --reload

pause
