@echo off
setlocal
echo ===============================
echo SmartPOS CRM AI - Full Stack
echo ===============================

set "ROOT_DIR=%~dp0"
set "BACKEND_BAT=%ROOT_DIR%run_backend.bat"
set "FRONTEND_BAT=%ROOT_DIR%run_frontend.bat"

if not exist "%BACKEND_BAT%" (
	echo [ERROR] Missing file: "%BACKEND_BAT%"
	pause
	exit /b 1
)

if not exist "%FRONTEND_BAT%" (
	echo [ERROR] Missing file: "%FRONTEND_BAT%"
	pause
	exit /b 1
)

start "SmartPOS Backend" cmd /k ""%BACKEND_BAT%""
timeout /t 3 >nul
start "SmartPOS Frontend" cmd /k ""%FRONTEND_BAT%""

echo [INFO] Backend and frontend launch commands sent.
pause
endlocal
