@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "RUNTIME_VENV_PYTHON=.venv314\Scripts\python.exe"
set "LEGACY_VENV_PYTHON=.venv\Scripts\python.exe"
set "VENV_PYTHON="
set "PYTHON_EXE="
set "PYTHON_ARGS="
set "APP_URL=http://127.0.0.1:8000"

python -c "import sys" >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_EXE=python"
)

if not defined PYTHON_EXE (
  py -3 -c "import sys" >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_EXE=py"
    set "PYTHON_ARGS=-3"
  )
)

if exist "%RUNTIME_VENV_PYTHON%" (
  call :test_python "%RUNTIME_VENV_PYTHON%"
  if not errorlevel 1 (
    set "VENV_PYTHON=%RUNTIME_VENV_PYTHON%"
  )
)

if not defined VENV_PYTHON if exist "%LEGACY_VENV_PYTHON%" (
  call :test_python "%LEGACY_VENV_PYTHON%"
  if not errorlevel 1 (
    set "VENV_PYTHON=%LEGACY_VENV_PYTHON%"
  )
)

if not defined VENV_PYTHON (
  if exist "%LEGACY_VENV_PYTHON%" (
    echo Existing .venv is not runnable; creating a fresh runtime in .venv314...
  )
  set "VENV_PYTHON=%RUNTIME_VENV_PYTHON%"
)

if not exist "%VENV_PYTHON%" (
  if not defined PYTHON_EXE (
    echo Python 3.11+ was not found.
    echo Install Python from https://www.python.org/downloads/windows/
    echo and make sure "Add python.exe to PATH" is checked.
    pause
    exit /b 1
  )

  echo Creating virtual environment in .venv314...
  "%PYTHON_EXE%" %PYTHON_ARGS% -m venv --without-pip .venv314
  if errorlevel 1 (
    echo Failed to create the virtual environment.
    pause
    exit /b 1
  )
)

if not exist "%VENV_PYTHON%" (
  echo The virtual environment was not created successfully.
  pause
  exit /b 1
)

echo Checking dependencies...
"%VENV_PYTHON%" -c "import fastapi, uvicorn, jinja2, multipart, sqlalchemy, openpyxl, xlrd" >nul 2>nul
if errorlevel 1 (
  echo Installing missing dependencies...
  call :install_deps
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
) else (
  echo Dependencies already installed.
)

echo Starting server...
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='%APP_URL%'; for ($i = 0; $i -lt 30; $i++) { try { [void](Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 1); Start-Process $url; exit 0 } catch { Start-Sleep -Seconds 1 } }"
"%VENV_PYTHON%" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
exit /b %errorlevel%

:test_python
"%~1" -c "import sys" >nul 2>nul
exit /b %errorlevel%

:install_deps
"%VENV_PYTHON%" -m pip --version >nul 2>nul
if not errorlevel 1 (
  "%VENV_PYTHON%" -m pip install -r requirements.txt
  exit /b %errorlevel%
)

if not defined PYTHON_EXE (
  echo A working system Python with pip was not found.
  exit /b 1
)

for %%I in ("%VENV_PYTHON%") do set "VENV_SITE_PACKAGES=%%~dpI..\Lib\site-packages"
"%PYTHON_EXE%" %PYTHON_ARGS% -m pip install --target "%VENV_SITE_PACKAGES%" -r requirements.txt
exit /b %errorlevel%

