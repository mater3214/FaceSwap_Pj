@echo off
REM =====================================================
REM   FaceLab HeadNeRF - Anaconda Startup Script
REM   Activates 'simswap' (or headnerf) conda environment
REM =====================================================
setlocal

echo =======================================
echo   FaceLab HeadNeRF Service (Port 8003)
echo =======================================
echo.

REM Change to headnerf_service directory
cd /d "%~dp0Service\headnerf_service"

REM Activate conda environment (headnerf shares similar deps with simswap)
call conda activate simswap
if errorlevel 1 (
    echo ERROR: Failed to activate 'simswap' conda environment.
    echo HeadNeRF requires PyTorch, torchvision, face_alignment, etc.
    pause
    exit /b 1
)

echo Starting HeadNeRF Service on http://localhost:8003 ...
echo Press Ctrl+C to stop.
echo.

uvicorn app:app --host 0.0.0.0 --port 8003 --reload

pause
