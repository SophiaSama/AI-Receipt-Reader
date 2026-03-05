# E2E Test Server Requirements Guide

the Playwright E2E tests require the **frontend and backend to be running**, but:

✅ **Simple**: Only **ONE command** needed: `npm run dev`  
✅ **Integrated**: Vite dev server serves both frontend and backend API routes  
✅ **No separate builds**: Tests run against the development server

---

## 🏗️ Architecture Understanding

### SmartReceiptReader Setup

Your app uses **Vite with Vercel serverless functions**, which means:

```
┌─────────────────────────────────────┐
│     npm run dev (port 3000)         │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Frontend (React + Vite)     │ │
│  │   http://localhost:3000       │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │   Backend API Routes          │ │
│  │   /api/health                 │ │
│  │   /api/receipts               │ │
│  │   /api/receipts/manual        │ │
│  │   /api/receipts/delete        │ │
│  │   /api/process                │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Both frontend and backend are served by the same Vite dev server!**

---

## 🚀 Running E2E Tests - Complete Workflow

### Option 1: Two Terminals (Recommended for Development)

#### Terminal 1 - Start Development Server
```powershell
# In project root
cd d:\projects\SmartReceiptReader

# Start dev server (frontend + backend)
npm run dev
```

**Wait for:**
```
  VITE v6.2.0  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

#### Terminal 2 - Run E2E Tests
```powershell
# In another terminal
cd d:\projects\SmartReceiptReader\tests\e2e\playwright

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run tests
pytest --headed

# Or run specific tests
pytest tests/test_health.py -v
```

---

### Option 2: Single Command with Background Server

Use the automated runner scripts:

**Windows (PowerShell):**
```powershell
cd d:\projects\SmartReceiptReader
.\tests\e2e\playwright\run-e2e-tests.ps1
```

**Mac/Linux (Bash):**
```bash
cd /path/to/SmartReceiptReader
./tests/e2e/playwright/run-e2e-tests.sh
```

See `tests/e2e/playwright/tests/doc/AUTOMATED_RUNNER.md` for all options.

---

### Option 3: CI/CD (Automated)

In GitHub Actions, the workflow already handles this:

```yaml
# .github/workflows/e2e-playwright.yml (already exists)
- name: Start dev server
  run: npm run dev &
  
- name: Wait for server
  run: npx wait-on http://localhost:3000

- name: Run Playwright tests
  run: |
    cd tests/e2e/playwright
    pytest
```

---

## 📋 Pre-Test Checklist

Before running E2E tests, ensure:

- [ ] **Node.js installed** (v20+)
- [ ] **Python installed** (v3.8+)
- [ ] **Dependencies installed**: `npm install` (in project root)
- [ ] **Python venv setup**: `cd tests/e2e/playwright && .\setup.ps1`
- [ ] **Dev server running**: `npm run dev` (in separate terminal)
- [ ] **Server accessible**: Open http://localhost:3000 in browser
- [ ] **OpenRouter key (optional)**: Set `OPENROUTER_API_KEY` if testing non-Mistral models (missing key falls back to Mistral)

---

## ⚙️ Configuration

### Environment Variables (.env in playwright directory)

```bash
# tests/e2e/playwright/.env
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api
HEADLESS=false
```

**No separate backend URL needed** - API is served by Vite!

---

## 🔍 Verification Steps

### 1. Check Server is Running

```powershell
# Open browser
Start-Process "http://localhost:3000"

# Or use curl
curl http://localhost:3000

# Check API health
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "SmartReceipt API",
  "timestamp": "2026-01-26T..."
}
```

### 2. Check Frontend Loads

Browser should show:
- ✅ SmartReceipt interface
- ✅ Manual Entry button
- ✅ Upload Receipt section
- ✅ Receipt list

### 3. Run Health Check Test

```powershell
cd tests\e2e\playwright
pytest tests/test_health.py::TestHealthCheck::test_api_health_endpoint -v
```

Should output:
```
tests/test_health.py::TestHealthCheck::test_api_health_endpoint PASSED [100%]
```

---

## 🆚 Comparison with TypeScript E2E Tests

| Aspect | TypeScript E2E | Playwright E2E |
|--------|---------------|----------------|
| **Server Required?** | ✅ Yes | ✅ Yes |
| **Server Type** | `npm run dev` | `npm run dev` |
| **Setup Complexity** | Simple | Simple |
| **Testing** | API only | UI + API |

**Same requirement, but Playwright tests more!**

---

## 🐛 Troubleshooting

### Problem: "Connection refused" error

**Cause:** Dev server not running

**Solution:**
```powershell
# Start server first
npm run dev

# Then run tests
cd tests\e2e\playwright
pytest
```

---

### Problem: "Port 3000 already in use"

**Cause:** Another process using port 3000

**Solution:**
```powershell
# Find process
Get-NetTCPConnection -LocalPort 3000

# Kill it
Stop-Process -Id <PID>

# Or use different port
# In vite.config.ts, change server.port
```

---

### Problem: Tests fail with "Timeout waiting for page load"

**Cause:** Server starting slowly

**Solution:**
```powershell
# Wait longer for server to start
# Or increase timeout in pytest.ini:
[pytest]
base_url = http://localhost:3000
# timeout = 60000
```

---

## 🎯 Best Practices

### For Local Development

1. **Keep server running** in dedicated terminal
2. **Run tests in separate terminal**
3. **Use `--headed` mode** to see what's happening
4. **Watch mode** for rapid testing:
   ```powershell
   pytest --headed -f  # Rerun on file changes
   ```

### For CI/CD

1. **Start server in background** (`npm run dev &`)
2. **Wait for server** (`wait-on http://localhost:3000`)
3. **Run tests** (already configured in GitHub Actions)
4. **Cleanup** (stop server after tests)

---

## 📊 Server Startup Time

Typical startup times:

| Machine | Startup Time |
|---------|--------------|
| Fast (SSD, 16GB RAM) | 2-3 seconds |
| Average | 5-8 seconds |
| Slow | 10-15 seconds |

**Add buffer time** when automating!

---

## 🔄 Do I Need to Build?

### For Development Tests

**NO BUILD NEEDED!** ✅

```powershell
# Just run dev server
npm run dev

# Tests use development build
pytest
```

### For Production-Like Tests

**BUILD REQUIRED** (optional, advanced)

```powershell
# Build production version
npm run build

# Serve production build
npm run preview  # Uses port 4173 by default

# Update .env to use preview port
# BASE_URL=http://localhost:4173

# Run tests
pytest
```

**Recommendation:** Stick with `npm run dev` for E2E tests during development.

---

## 🎬 Complete Example Workflow

### Step-by-Step: Running Your First E2E Test

```powershell
# 1. Open first terminal - Start server
cd d:\projects\SmartReceiptReader
npm run dev

# Output: VITE v6.2.0 ready in 1234 ms
#         ➜  Local: http://localhost:3000/

# 2. Open second terminal - Run tests
cd d:\projects\SmartReceiptReader\tests\e2e\playwright

# Activate Python environment (if not already)
.\.venv\Scripts\Activate.ps1

# Run a simple health check
pytest tests/test_health.py::TestHealthCheck::test_app_loads --headed

# Success! Browser opens, navigates to app, test passes

# Run all tests
pytest --headed

# Watch browser automation magic ✨
```

---

## 📝 Summary

### Requirements

✅ **Frontend + Backend running** via `npm run dev`  
✅ **Single command** - Vite serves both  
✅ **No separate backend server** needed  
✅ **No build step required** for dev testing  

### Simple Workflow

1. **Terminal 1:** `npm run dev` ← Keep running
2. **Terminal 2:** `pytest` ← Run tests

### Why This Works

Your SmartReceiptReader uses:
- **Vite dev server** - Serves React frontend
- **Vercel serverless functions** - API routes under `/api/*`
- **Vite proxy** (configured in `vite.config.ts`) - Routes `/api/*` to serverless handlers

**One server, everything works!** 🎉

---

## 🚀 Next Steps

Would you like me to:

1. ✅ **Use automated test runner scripts** (`run-e2e-tests.ps1`)
2. ✅ **Add server health check** to test setup
3. ✅ **Create VS Code tasks** for one-click test running
4. ✅ **Add npm script** to run E2E tests with server auto-start

Let me know which would be most helpful!

---

*Server Requirements Guide - January 26, 2026*
