@echo off
echo Starting SimSwap Service on port 8001...
cd /d "%~dp0Service\simswap_service"
python -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
pause
