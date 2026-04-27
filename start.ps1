$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot
$runtimeVenvPython = Join-Path $PSScriptRoot ".venv314\Scripts\python.exe"
$legacyVenvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$venvPython = $null
$appUrl = "http://127.0.0.1:8000"
$pythonCommand = $null
$pythonArgs = @()

function Test-PythonExe {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return $false
  }

  try {
    & $Path -c "import sys" *> $null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  }
}

function Install-Requirements {
  param(
    [string]$VenvPython,
    [string]$PythonCommand,
    [string[]]$PythonArgs
  )

  & $VenvPython -m pip --version *> $null
  if ($LASTEXITCODE -eq 0) {
    & $VenvPython -m pip install -r .\requirements.txt
    return $LASTEXITCODE
  }

  if (-not $PythonCommand) {
    Write-Host "A working system Python with pip was not found." -ForegroundColor Red
    return 1
  }

  $venvRoot = Split-Path (Split-Path $VenvPython -Parent) -Parent
  $sitePackages = Join-Path $venvRoot "Lib\site-packages"
  & $PythonCommand @PythonArgs -m pip install --target $sitePackages -r .\requirements.txt
  return $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  try {
    & python -c "import sys" *> $null
    if ($LASTEXITCODE -eq 0) {
      $pythonCommand = "python"
    }
  } catch {
  }
}

if (-not $pythonCommand -and (Get-Command py -ErrorAction SilentlyContinue)) {
  try {
    & py -3 -c "import sys" *> $null
    if ($LASTEXITCODE -eq 0) {
      $pythonCommand = "py"
      $pythonArgs = @("-3")
    }
  } catch {
  }
}

if (Test-PythonExe $runtimeVenvPython) {
  $venvPython = $runtimeVenvPython
} elseif (Test-PythonExe $legacyVenvPython) {
  $venvPython = $legacyVenvPython
} else {
  if (Test-Path $legacyVenvPython) {
    Write-Host "Existing .venv is not runnable; creating a fresh runtime in .venv314..." -ForegroundColor Yellow
  }

  $venvPython = $runtimeVenvPython
}

if (-not (Test-Path $venvPython)) {
  if (-not $pythonCommand) {
    Write-Host "Python 3.11+ was not found." -ForegroundColor Red
    Write-Host "Install Python from https://www.python.org/downloads/windows/"
    Write-Host "and make sure 'Add python.exe to PATH' is checked."
    exit 1
  }

  Write-Host "Creating virtual environment in .venv314..."
  & $pythonCommand @pythonArgs -m venv --without-pip .venv314
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create the virtual environment."
  }
}

if (-not (Test-Path $venvPython)) {
  throw "The virtual environment was not created successfully."
}

Write-Host "Checking dependencies..."
& $venvPython -c "import fastapi, uvicorn, jinja2, multipart, sqlalchemy, openpyxl, xlrd" *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Installing missing dependencies..."
  $installExitCode = Install-Requirements -VenvPython $venvPython -PythonCommand $pythonCommand -PythonArgs $pythonArgs
  if ($installExitCode -ne 0) {
    throw "Dependency installation failed."
  }
} else {
  Write-Host "Dependencies already installed."
}

Write-Host "Starting server..."
Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "for (`$i = 0; `$i -lt 30; `$i++) { try { Invoke-WebRequest -UseBasicParsing '$appUrl' -TimeoutSec 1 | Out-Null; Start-Process '$appUrl'; exit 0 } catch { Start-Sleep -Seconds 1 } }"
)
& $venvPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

