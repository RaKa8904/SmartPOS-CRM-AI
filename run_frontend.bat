@echo off
echo ===============================
echo Starting Frontend (Vite + React)
echo ===============================

cd frontend

if not exist node_modules (
    echo ⚠️ node_modules not found
    echo 📦 Running npm install...
    npm install
)

echo 🚀 Starting frontend...
npm run dev

pause
