@echo off
echo =======================================
echo   FaceLab Services Launcher
echo =======================================
echo.
echo Starting Gateway (port 8000)...
start "FaceLab Gateway" cmd /c "%~dp0start_gateway.bat"
timeout /t 3 /nobreak > nul

echo Starting SimSwap Service (port 8001)...
start "FaceLab SimSwap" cmd /c "%~dp0start_simswap.bat"

echo.
echo =======================================
echo   All services started!
echo   Gateway:  http://localhost:8000
echo   SimSwap:  http://localhost:8001/docs
echo =======================================
echo.
echo To start frontend, run in frontend folder:
echo   npm run dev
echo.
pause
