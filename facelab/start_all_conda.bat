@echo off
REM =====================================================
REM   FaceLab - All Services Launcher (Conda Version)
REM   Starts all services in separate windows with conda
REM =====================================================

echo =======================================
echo   FaceLab Services Launcher (Conda)
echo =======================================
echo.

REM Start Gateway (port 8000)
echo [1/4] Starting Gateway (port 8000)...
start "FaceLab Gateway" cmd /k "call %~dp0start_gateway_conda.bat"
timeout /t 3 /nobreak > nul

REM Start SimSwap Service (port 8001)
echo [2/4] Starting SimSwap Service (port 8001)...
start "FaceLab SimSwap" cmd /k "call %~dp0start_simswap_conda.bat"
timeout /t 2 /nobreak > nul

REM Start Background Removal Service (port 8002)
echo [3/4] Starting Background Removal (port 8002)...
start "FaceLab BG Removal" cmd /k "call %~dp0start_bgrm_conda.bat"
timeout /t 2 /nobreak > nul

REM Start HeadNeRF Service (port 8003)
echo [4/4] Starting HeadNeRF Service (port 8003)...
start "FaceLab HeadNeRF" cmd /k "call %~dp0start_headnerf_conda.bat"

echo.
echo =======================================
echo   All services starting!
echo =======================================
echo.
echo   Gateway:           http://localhost:8000
echo   SimSwap:           http://localhost:8001/docs
echo   Background Removal: http://localhost:8002/docs
echo   HeadNeRF:          http://localhost:8003/docs
echo.
echo =======================================
echo   Frontend (run in frontend folder):
echo   npm run dev
echo =======================================
echo.
pause
