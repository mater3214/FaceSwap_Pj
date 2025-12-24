@echo off
echo Starting Gateway Service on port 8000...
cd /d "%~dp0gateway"
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
pause
