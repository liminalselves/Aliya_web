# CD30 Special Edition Startup Script
# PowerShell Version

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CD30 Special Edition Startup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Python installation
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[INFO] Python Version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.8+" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check dependencies
Write-Host "[INFO] Checking dependencies..." -ForegroundColor Yellow
$flaskInstalled = pip show flask 2>&1
if (-not $flaskInstalled) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

# Set environment variables
$env:CD30_ACCESS_PASSWORD = "cd30aliyaweb"
$env:CD30_REMOTE_API_KEY = "yGMjJwKW3qkrtNfJ7ydJXcFZhOjKYuGc"
$env:CD30_DEFAULT_MODEL = "akqrsc9j5u"
$env:CD30_DEFAULT_IMAGE_MODEL = "nai-diffusion-4-5-full"
$env:ALIYA_HOST = "0.0.0.0"
$env:ALIYA_PORT = "4000"
$env:ALIYA_DEBUG = "false"

Write-Host ""
Write-Host "[INFO] Environment variables configured" -ForegroundColor Green
Write-Host "[INFO] Access Password: $env:CD30_ACCESS_PASSWORD" -ForegroundColor Cyan
Write-Host "[INFO] Default Model: $env:CD30_DEFAULT_MODEL" -ForegroundColor Cyan
Write-Host "[INFO] Default Image Model: $env:CD30_DEFAULT_IMAGE_MODEL" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Starting server..." -ForegroundColor Green
Write-Host "[INFO] Local access: http://localhost:$env:ALIYA_PORT" -ForegroundColor Cyan
Write-Host "[INFO] LAN access: http://$env:COMPUTERNAME:$env:ALIYA_PORT" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop server" -ForegroundColor Yellow
Write-Host ""

# Start server
python misskey_server.py

Read-Host "Press Enter to exit"
