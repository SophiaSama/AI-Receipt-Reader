# Automated E2E Test Runner

## 🎯 Quick Start

The automated test runner scripts (`run-e2e-tests.ps1` for Windows, `run-e2e-tests.sh` for Mac/Linux) automatically:
- ✅ Checks if server is running
- ✅ Starts server if needed
- ✅ Waits for server to be ready
- ✅ Runs Playwright tests
- ✅ Stops server after tests (optional)

---

## 🚀 Usage

### Basic Usage (Simplest)

**Windows (PowerShell):**
```powershell
# From project root OR playwright directory
.\tests\e2e\playwright\run-e2e-tests.ps1
```

**Mac/Linux (Bash):**
```bash
# From project root OR playwright directory
./tests/e2e/playwright/run-e2e-tests.sh
```

### With Options

**Windows (PowerShell):**
```powershell
# Run with visible browser
.\run-e2e-tests.ps1 -Headed

# Run specific test file
.\run-e2e-tests.ps1 -TestPath "tests/test_health.py"

# Run specific test
.\run-e2e-tests.ps1 -TestPath "tests/test_health.py::TestHealthCheck::test_app_loads"

# Keep server running after tests
.\run-e2e-tests.ps1 -KeepServerRunning

# Use different browser
.\run-e2e-tests.ps1 -Browser "firefox"

# Combine options
.\run-e2e-tests.ps1 -Headed -TestPath "tests/test_manual_receipt.py" -Browser "chromium"
```

**Mac/Linux (Bash):**
```bash
# Run with visible browser
./run-e2e-tests.sh --headed

# Run specific test file
./run-e2e-tests.sh --test-path "tests/test_health.py"

# Run specific test
./run-e2e-tests.sh --test-path "tests/test_health.py::TestHealthCheck::test_app_loads"

# Keep server running after tests
./run-e2e-tests.sh --keep-server

# Use different browser
./run-e2e-tests.sh --browser firefox

# Combine options
./run-e2e-tests.sh --headed --test-path "tests/test_manual_receipt.py" --browser chromium
```

---

## 📋 Parameters

### Windows PowerShell
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-TestPath` | string | "" | Specific test file or test to run |
| `-Headed` | switch | false | Show browser window during tests |
| `-KeepServerRunning` | switch | false | Don't stop server after tests |
| `-Browser` | string | "chromium" | Browser to use (chromium, firefox, webkit) |

### Mac/Linux Bash
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `--test-path` | string | "" | Specific test file or test to run |
| `--headed` | flag | false | Show browser window during tests |
| `--keep-server` | flag | false | Don't stop server after tests |
| `--browser` | string | "chromium" | Browser to use (chromium, firefox, webkit) |

---

## 📊 Examples

### Example 1: Quick Smoke Test

**Windows:**
```powershell
# Run health checks only with visible browser
.\run-e2e-tests.ps1 -TestPath "tests/test_health.py" -Headed
```

**Mac/Linux:**
```bash
# Run health checks only with visible browser
./run-e2e-tests.sh --test-path "tests/test_health.py" --headed
```

**Output:**
```
[E2E] SmartReceipt E2E Test Runner
================================

[CHECK] Checking if dev server is already running...
[WARN] Dev server not running

[START] Starting dev server...
[WAIT] Waiting for server to be ready...
[OK] Server is ready at http://localhost:3000
[HEALTH] Checking API health endpoint...
[OK] API is healthy: SmartReceipt API

[TEST] Running Playwright E2E tests...

tests/test_health.py::TestHealthCheck::test_app_loads PASSED
tests/test_health.py::TestHealthCheck::test_api_health_endpoint PASSED

================================
[PASS] All tests passed!
```

---

### Example 2: Full Test Suite

**Windows:**
```powershell
# Run all tests, headless, auto-cleanup
.\run-e2e-tests.ps1
```

**Mac/Linux:**
```bash
# Run all tests, headless, auto-cleanup
./run-e2e-tests.sh
```

---

### Example 3: Development Testing

**Windows:**
```powershell
# Run tests with browser visible, keep server for next run
.\run-e2e-tests.ps1 -Headed -KeepServerRunning
```

Then subsequent runs are faster:
```powershell
# Server already running, just run tests
.\run-e2e-tests.ps1 -Headed
```

**Mac/Linux:**
```bash
# Run tests with browser visible, keep server for next run
./run-e2e-tests.sh --headed --keep-server
```

Then subsequent runs are faster:
```bash
# Server already running, just run tests
./run-e2e-tests.sh --headed
```

---

### Example 4: Test Specific Feature

**Windows:**
```powershell
# Test manual receipt entry workflow
.\run-e2e-tests.ps1 `
    -TestPath "tests/test_manual_receipt.py::TestManualReceipt::test_fill_and_submit_manual_receipt" `
    -Headed `
    -Browser "chromium"
```

**Mac/Linux:**
```bash
# Test manual receipt entry workflow
./run-e2e-tests.sh \
    --test-path "tests/test_manual_receipt.py::TestManualReceipt::test_fill_and_submit_manual_receipt" \
    --headed \
    --browser chromium
```

---

## 🔍 What the Script Does

### 1. Server Check
```
🔍 Checking if dev server is already running...
```
- Attempts to connect to `http://localhost:3000`
- If running: Uses existing server
- If not: Starts new server

### 2. Server Startup (if needed)
```
🚀 Starting dev server...
⏳ Waiting for server to be ready...
   Attempt 1/30...
   Attempt 2/30...
✅ Server is ready at http://localhost:3000
```
- Starts `npm run dev` in background
- Polls server up to 30 times (30 seconds)
- Verifies server responds with HTTP 200

### 3. Health Check
```
🏥 Checking API health endpoint...
✅ API is healthy: SmartReceipt API
```
- Calls `/api/health` endpoint
- Confirms backend is ready

### 4. Test Execution
```
🧪 Running Playwright E2E tests...
Command: pytest tests/test_health.py --headed --browser chromium -v

tests/test_health.py::TestHealthCheck::test_app_loads PASSED
...
```
- Activates Python virtual environment
- Runs pytest with specified options
- Shows detailed output

### 5. Cleanup
```
🛑 Stopping dev server...
✅ Server stopped
```
- Stops server if script started it
- Leaves running if it was already running
- Can be disabled with `-KeepServerRunning`

### 6. Summary
```
================================
✅ All tests passed!
```
- Reports test results
- Returns appropriate exit code

---

## ⚙️ Configuration

### Environment Variables

The script respects `.env` file in the playwright directory:

```bash
# tests/e2e/playwright/.env
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api
HEADLESS=false
```

### Port Configuration

To use a different port:

1. Update `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3001  // Change port
  }
})
```

2. Update `.env`:
```bash
BASE_URL=http://localhost:3001
```

3. Script will automatically use new port

---

## 🐛 Troubleshooting

### Problem: "Port 3000 already in use"

**Solution 1: Stop existing server**
```powershell
Get-Process -Name "node" | Stop-Process
.\run-e2e-tests.ps1
```

**Solution 2: Use existing server**
```powershell
# In Terminal 1
npm run dev

# In Terminal 2 (script detects running server)
.\run-e2e-tests.ps1
```

---

### Problem: "Virtual environment not found"

**Cause:** Playwright not set up

**Solution:**
```powershell
cd tests\e2e\playwright
.\setup.ps1
.\run-e2e-tests.ps1
```

---

### Problem: "Server failed to start"

**Cause:** Port conflict or npm issue

**Solution:**
```powershell
# Check what's using port 3000
Get-NetTCPConnection -LocalPort 3000

# Try starting manually to see error
npm run dev
```

---

### Problem: Tests fail but server is running

**Cause:** Tests may have issues

**Solution:**
```powershell
# Run with verbose output and headed mode
.\run-e2e-tests.ps1 -Headed -TestPath "tests/test_health.py" -Browser "chromium"

# Check specific test
pytest tests/test_health.py -v -s
```

---

## 🎯 Best Practices

### For Development

1. **First run of the day:**
   ```powershell
   .\run-e2e-tests.ps1 -Headed -KeepServerRunning
   ```

2. **Subsequent runs:**
   ```powershell
   .\run-e2e-tests.ps1 -Headed
   # Faster! Server already running
   ```

3. **End of day:**
   ```powershell
   # Stop server
   Get-Process -Name "node" | Stop-Process
   ```

### For CI/CD

The GitHub Actions workflow uses a similar approach:
```yaml
- name: Start dev server
  run: npm run dev &
  
- name: Wait for server
  run: npx wait-on http://localhost:3000
  
- name: Run tests
  run: pytest
```

### For Quick Testing

```powershell
# Test one feature quickly
.\run-e2e-tests.ps1 -TestPath "tests/test_health.py" -Headed
```

---

## 🔄 Alternative: Manual Method

If you prefer manual control:

### Terminal 1 - Server
```powershell
cd d:\projects\SmartReceiptReader
npm run dev
# Keep this running
```

### Terminal 2 - Tests
```powershell
cd d:\projects\SmartReceiptReader\tests\e2e\playwright
.\.venv\Scripts\Activate.ps1
pytest --headed
```

---

## 📊 Comparison

| Method | Pros | Cons |
|--------|------|------|
| **Automated Script** | ✅ One command<br>✅ Auto-starts server<br>✅ Auto-cleanup | ⚠️ Slower first run |
| **Manual (2 terminals)** | ✅ Full control<br>✅ See server logs<br>✅ Faster reruns | ❌ More steps<br>❌ Easy to forget |

---

## 🎓 Script Customization

Want to customize? Edit `run-e2e-tests.ps1`:

```powershell
# Change default browser
$Browser = "firefox"  # Line ~6

# Change max wait time
$maxAttempts = 60  # Line ~51 (default: 30 = 30 seconds)

# Change port
# (Better: update vite.config.ts and .env)

# Add pre-test commands
# Add after line ~100, before pytest
Write-Host "Running custom setup..."
# Your commands here
```

---

## ✅ Summary

### Simple Usage
```powershell
# From anywhere in project
.\tests\e2e\playwright\run-e2e-tests.ps1 -Headed
```

### What You Get
- ✅ Automatic server management
- ✅ Health checks
- ✅ Clean test execution
- ✅ Proper cleanup
- ✅ Detailed output

### Time Saved
- 🚀 No manual server starting
- 🚀 No forgetting to stop server
- 🚀 No port conflicts
- 🚀 One command to rule them all

---

*Automated Test Runner Guide - January 26, 2026*
