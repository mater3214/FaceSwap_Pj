@echo off
echo Starting FaceLab Services...
echo (Waiting between services to prevent conda conflicts...)

:: Define Anaconda Activate Path (Verified)
set "ACTIVATE_PATH=C:\Users\painh\anaconda3\Scripts\activate.bat"

:: 1. Gateway (Env: web)
start "FaceLab Gateway" cmd /k "call "%ACTIVATE_PATH%" web && cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\facelab\gateway" && python -m uvicorn app:app --host 0.0.0.0 --port 8000"
timeout /t 2 /nobreak >nul

:: 2. SimSwap Service (Env: simswap)
start "SimSwap Service" cmd /k "call "%ACTIVATE_PATH%" simswap && cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\facelab\Service\simswap_service" && python -m uvicorn app:app --host 0.0.0.0 --port 8001"
timeout /t 2 /nobreak >nul

:: 3. Background Removal Service (Env: bgrm)
start "Background Removal Service" cmd /k "call "%ACTIVATE_PATH%" bgrm && cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\facelab\Service\background_removal_service" && python -m uvicorn app:app --host 0.0.0.0 --port 8002"
timeout /t 2 /nobreak >nul

:: 4. HeadNeRF Service (Env: headnerf)
start "HeadNeRF Service" cmd /k "call "%ACTIVATE_PATH%" headnerf && cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\facelab\Service\headnerf_service" && python -m uvicorn app:app --host 0.0.0.0 --port 8003"
timeout /t 2 /nobreak >nul

:: 5. Live Deepfake Service (Env: simswap)
start "Live Deepfake Service" cmd /k "call "%ACTIVATE_PATH%" simswap && cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\facelab\Service\live_service" && python -m uvicorn app:app --host 0.0.0.0 --port 8004"
timeout /t 2 /nobreak >nul

:: 6. Frontend Service (Vite/Next.js)
start "FaceLab Frontend" cmd /k "cd /d "C:\Users\painh\Desktop\CS FINALPROJECT\frontend" && npm run dev"

echo All services initiation commands sent.
pause