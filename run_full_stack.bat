@echo off
echo ===============================
echo SmartPOS CRM AI – Full Stack
echo ===============================

start cmd /k run_backend.bat
timeout /t 5 > nul
start cmd /k run_frontend.bat

echo ✅ Backend + Frontend started
echo 🔔 Reminder: Commit & push after changes!

pause
