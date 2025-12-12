# Build Android APK locally
# Encoding: UTF-8

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Build Android APK Locally" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Next.js server is running
Write-Host "[1/4] Checking Next.js server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/manifest.json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "[OK] Next.js server is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Next.js server is not running" -ForegroundColor Red
    Write-Host "Please run 'pnpm dev' first" -ForegroundColor Yellow
    exit 1
}

# Clean old build directory
Write-Host ""
Write-Host "[2/4] Cleaning old build..." -ForegroundColor Yellow
if (Test-Path "twa-project") {
    Remove-Item -Recurse -Force "twa-project"
    Write-Host "[OK] Old directory cleaned" -ForegroundColor Green
}

# Initialize Bubblewrap project
Write-Host ""
Write-Host "[3/4] Initializing Bubblewrap project..." -ForegroundColor Yellow
Write-Host "Please answer 'Y' when prompted to install JDK and Android SDK" -ForegroundColor Gray
Write-Host "This will take 10-15 minutes on first run" -ForegroundColor Gray
Write-Host ""

bubblewrap init --manifest=http://localhost:3000/manifest.json --directory=./twa-project

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Initialization failed or cancelled" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Bubblewrap project initialized" -ForegroundColor Green

# Build APK
Write-Host ""
Write-Host "[4/4] Building Android APK..." -ForegroundColor Yellow
Set-Location twa-project
bubblewrap build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "[SUCCESS] APK built successfully!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK Location:" -ForegroundColor Cyan
    Get-ChildItem -Recurse -Filter "*.apk" | ForEach-Object {
        Write-Host "  -> $($_.FullName)" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "[ERROR] APK build failed" -ForegroundColor Red
}

Set-Location ..
