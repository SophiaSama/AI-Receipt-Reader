# PowerShell setup script for Playwright E2E tests (Windows)

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Playwright E2E Test Setup" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Create virtual environment
Write-Host ""
Write-Host "▶ Creating Python virtual environment..." -ForegroundColor Yellow
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
Write-Host ""
Write-Host "▶ Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Install browsers
Write-Host ""
Write-Host "▶ Installing Playwright browsers..." -ForegroundColor Yellow
Write-Host "  (This may take a few minutes...)" -ForegroundColor Gray
playwright install --with-deps

# Create .env
Write-Host ""
Write-Host "▶ Setting up environment..." -ForegroundColor Yellow
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✓ .env file created" -ForegroundColor Green
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "✓ Setup complete!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To activate the virtual environment:" -ForegroundColor White
Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "To run tests:" -ForegroundColor White
Write-Host "  pytest" -ForegroundColor Gray
Write-Host ""
