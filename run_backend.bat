@echo off
echo ===============================
echo Starting Backend (FastAPI)
echo ===============================

cd backend

if not exist venv (
    echo ❌ venv not found
    pause
    exit
)

call venv\Scripts\activate

echo ✅ Virtual environment activated
echo 🚀 Starting FastAPI server...

uvicorn main:app --reload --host 127.0.0.1 --port 8000

pause
