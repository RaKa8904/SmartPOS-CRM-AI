@echo off
setlocal
echo ===============================
echo Starting Frontend (Vite + React)
echo ===============================

set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%frontend"

if not exist "%FRONTEND_DIR%" (
    echo [ERROR] frontend folder not found: "%FRONTEND_DIR%"
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    echo Install Node.js LTS and restart terminal.
    pause
    exit /b 1
)

pushd "%FRONTEND_DIR%"

if not exist node_modules (
    echo [WARN] node_modules not found. Running npm install...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        popd
        pause
        exit /b 1
    )
)

echo [INFO] Starting Vite dev server...
npm run dev

popd
pause
endlocal
