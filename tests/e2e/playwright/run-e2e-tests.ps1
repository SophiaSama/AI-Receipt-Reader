# E2E Test Runner - Automated server startup and test execution
# Usage: .\run-e2e-tests.ps1

param(
    [string]$TestPath = "",
    [switch]$Headed = $false,
    [switch]$KeepServerRunning = $false,
    [string]$Browser = "chromium"
)

# Set output encoding to UTF-8 to handle Unicode characters in pytest output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "[E2E] SmartReceipt E2E Test Runner" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Store current location
$originalLocation = Get-Location

# Navigate to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
Set-Location $projectRoot

# Check if server is already running
Write-Host "[CHECK] Checking if dev server is already running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    $serverAlreadyRunning = $true
    Write-Host "[OK] Dev server is already running!" -ForegroundColor Green
}
catch {
    $serverAlreadyRunning = $false
    Write-Host "[WARN] Dev server not running" -ForegroundColor Red
}

$serverProcess = $null

# Start server if not running
if (-not $serverAlreadyRunning) {
    Write-Host ""
    Write-Host "[START] Starting dev server..." -ForegroundColor Yellow
    
    # Start server in background
    $serverProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -PassThru -WindowStyle Minimized
    
    Write-Host "[WAIT] Waiting for server to be ready..." -ForegroundColor Yellow
    
    $maxAttempts = 30
    $attempt = 0
    $serverReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $serverReady) {
        try {
            Start-Sleep -Seconds 1
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $serverReady = $true
                Write-Host "[OK] Server is ready at http://localhost:3000" -ForegroundColor Green
            }
        }
        catch {
            $attempt++
            Write-Host "   Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
        }
    }
    
    if (-not $serverReady) {
        Write-Host "[ERROR] Server failed to start after $maxAttempts attempts" -ForegroundColor Red
        Write-Host "   Please check if port 3000 is available" -ForegroundColor Yellow
        Write-Host "   Try running 'npm run dev' manually to see errors" -ForegroundColor Yellow
        
        if ($serverProcess) {
            Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        }
        
        Set-Location $originalLocation
        exit 1
    }
    
    # Additional health check
    Write-Host "[HEALTH] Checking API health endpoint..." -ForegroundColor Yellow
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -TimeoutSec 5
        if ($healthResponse.status -eq "healthy") {
            Write-Host "[OK] API is healthy: $($healthResponse.service)" -ForegroundColor Green
        }
        else {
            Write-Host "[WARN] API responded but status is: $($healthResponse.status)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[WARN] API health check failed (tests may still work)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[TEST] Running Playwright E2E tests..." -ForegroundColor Cyan
Write-Host ""

# Navigate to playwright directory
Set-Location "$projectRoot\tests\e2e\playwright"

# Check if venv exists
if (-not (Test-Path ".\.venv")) {
    Write-Host "[ERROR] Virtual environment not found!" -ForegroundColor Red
    Write-Host "   Run setup first: .\setup.ps1" -ForegroundColor Yellow
    
    if (-not $serverAlreadyRunning -and $serverProcess) {
        Write-Host "[STOP] Stopping server..." -ForegroundColor Yellow
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Set-Location $originalLocation
    exit 1
}

# Build pytest command arguments
$pytestArgs = @()

if ($TestPath -ne "") {
    $pytestArgs += $TestPath
}

if ($Headed) {
    $pytestArgs += "--headed"
}

$pytestArgs += "--browser"
$pytestArgs += $Browser
$pytestArgs += "-v"

# Display command for debugging
$pytestArgsString = $pytestArgs -join " "
Write-Host "Running: python -m pytest $pytestArgsString" -ForegroundColor Gray
Write-Host ""

# Run pytest directly with Python from venv (no need to activate in script)
# This avoids PowerShell encoding issues with pytest output
$pythonExe = ".\.venv\Scripts\python.exe"

# Execute pytest and capture exit code
& $pythonExe -m pytest @pytestArgs
$testResult = $LASTEXITCODE

Write-Host ""

# Cleanup
if (-not $serverAlreadyRunning -and $serverProcess -and -not $KeepServerRunning) {
    Write-Host "[STOP] Stopping dev server..." -ForegroundColor Yellow
    
    # Find all node processes (Vite server)
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        $_.StartTime -gt (Get-Date).AddMinutes(-5)
    } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Also stop the PowerShell window we opened
    if ($serverProcess) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "[OK] Server stopped" -ForegroundColor Green
}
elseif ($KeepServerRunning) {
    Write-Host "[OK] Server left running (use -KeepServerRunning:`$false to stop)" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan

if ($testResult -eq 0) {
    Write-Host "[PASS] All tests passed!" -ForegroundColor Green
}
else {
    Write-Host "[FAIL] Some tests failed (exit code: $testResult)" -ForegroundColor Red
}

Write-Host ""

# Return to original location
Set-Location $originalLocation

exit $testResult
