@echo off
setlocal
echo ===============================
echo Starting Backend (FastAPI)
echo ===============================

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "PYTHON_EXE=%BACKEND_DIR%\venv\Scripts\python.exe"

if not exist "%BACKEND_DIR%" (
    echo [ERROR] backend folder not found: "%BACKEND_DIR%"
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python venv not found: "%PYTHON_EXE%"
    echo Create it with: python -m venv backend\venv
    pause
    exit /b 1
)

pushd "%BACKEND_DIR%"
echo [INFO] Using: %PYTHON_EXE%
echo [INFO] Starting FastAPI on http://127.0.0.1:8000

"%PYTHON_EXE%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

popd
pause
endlocal
