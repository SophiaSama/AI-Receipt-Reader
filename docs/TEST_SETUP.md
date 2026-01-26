# Test Setup and Prerequisites

## Overview

This project implements an automated test setup that ensures all dependencies and build artifacts are ready before test execution. The setup process is transparent and provides clear feedback about what's being built.

## Architecture

### Test Execution Flow

```
npm test (or npm run test:*)
    ↓
npm runs "pretest" script automatically
    ↓
scripts/pre-test-build.js executes
    ↓
Checks and builds all prerequisites:
  1. Root dependencies (node_modules)
  2. Backend TypeScript compilation
  3. Verifies all required files exist
    ↓
tests/setup.ts runs (Vitest setup file)
    ↓
Verifies build artifacts at runtime
    ↓
Test execution begins
```

## Components

### 1. Pre-Test Build Script (`scripts/pre-test-build.js`)

**Purpose:** Automated dependency and build management before tests run.

**What it does:**
- ✅ Checks if root `node_modules` exists
- ✅ Installs root dependencies if missing
- ✅ Checks if backend is compiled (`backend/dist/`)
- ✅ Builds backend TypeScript if needed
- ✅ Verifies all handler files exist
- ✅ Provides colored output for clear feedback
- ✅ Exits with error code if build fails

**When it runs:**
- Automatically before any `npm test` command
- Can be run manually: `node scripts/pre-test-build.js`

**Output example:**
```
═══════════════════════════════════════════════════
  Pre-Test Build & Dependency Check
═══════════════════════════════════════════════════

▶ Checking Root Dependencies
✓ Root dependencies are ready

▶ Checking Backend Build Artifacts
⚠ Backend build artifacts missing or incomplete

▶ Building Backend TypeScript
  Backend dependencies already installed
  Compiling TypeScript...
✓ Backend built successfully

▶ Verifying Test Prerequisites
✓ Backend handlers ready
✓ Backend services ready
✓ Backend utilities ready

═══════════════════════════════════════════════════
✓ All prerequisites ready for testing!
═══════════════════════════════════════════════════
```

### 2. Test Setup File (`tests/setup.ts`)

**Purpose:** Runtime verification and environment configuration.

**What it does:**
- ✅ Sets environment variables for tests
- ✅ Verifies backend build artifacts exist
- ✅ Fails fast with clear error if prerequisites missing
- ✅ Provides feedback about test environment status

**When it runs:**
- Before every test suite (Vitest setup file)
- Configured in `vitest.config.ts` as `setupFiles`

### 3. Package.json Scripts

**Configured scripts:**
```json
{
  "pretest": "node scripts/pre-test-build.js",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:integration": "vitest run tests/integration",
  "test:e2e": "vitest run tests/e2e",
  "test:coverage": "vitest run --coverage"
}
```

**How it works:**
- `pretest` is an npm lifecycle script
- npm automatically runs `pretest` before `test`
- All test commands inherit this behavior
- No need to remember to build first!

## Usage

### Running Tests

**Basic test run:**
```bash
npm test
```

**Test with UI:**
```bash
npm run test:ui
```

**Integration tests only:**
```bash
npm run test:integration
```

**E2E tests only:**
```bash
npm run test:e2e
```

**Note:** The above runs the legacy TypeScript E2E tests. For the new Playwright E2E tests, see the [Playwright E2E Tests](#playwright-e2e-tests) section below.

**With coverage:**
```bash
npm run test:coverage
```

### Manual Build

**If you want to build without running tests:**
```bash
# Run the pre-test build script
node scripts/pre-test-build.js

# Or just build backend
npm run build:backend
```

### Clean and Rebuild

**If tests are failing due to stale builds:**
```bash
# Remove backend build
rm -rf backend/dist

# Rebuild (will happen automatically on next test run)
npm test
```

## Why This Architecture?

### Problem It Solves

**Before:**
```bash
npm test
# ❌ Error: Cannot find module '/backend/dist/src/handlers/processReceipt.js'
# Developer: "Oh right, I need to build the backend first"
npm run build:backend
npm test
# ✓ Tests run
```

**After:**
```bash
npm test
# ✓ Automatically builds backend if needed
# ✓ Tests run
```

### Benefits

1. **Developer Experience**
   - Just run `npm test` - it works
   - No need to remember build steps
   - Clear feedback if something fails

2. **CI/CD Friendly**
   - Single command: `npm test`
   - Automated dependency management
   - Predictable behavior

3. **Fast Feedback**
   - Only builds if necessary
   - Skips build if artifacts exist
   - Caches dependencies

4. **Fail Fast**
   - Catches missing dependencies before tests run
   - Clear error messages
   - Prevents confusing test failures

## Troubleshooting

### Tests Fail with "Cannot find module"

**Cause:** Backend not built or build is stale.

**Solution:**
```bash
# Force rebuild
rm -rf backend/dist
npm test
```

### "Missing dependencies" errors

**Cause:** `node_modules` missing or incomplete.

**Solution:**
```bash
# Reinstall root dependencies
npm install

# Reinstall backend dependencies
cd backend && npm install && cd ..

# Or just run test (it will install automatically)
npm test
```

### Pre-test build script fails

**Cause:** Build errors in TypeScript code.

**Solution:**
```bash
# Check backend compilation directly
cd backend
npm run build

# Fix any TypeScript errors shown
# Then try tests again
```

### Vitest setup fails

**Cause:** Build artifacts missing despite pre-test script.

**Check:**
```bash
# Verify files exist
ls backend/dist/src/handlers/

# Should show:
# - processReceipt.js
# - getReceipts.js
# - manualSave.js
# - deleteReceipt.js
```

## Technical Details

### Why Tests Need Backend Built

**Dependency chain:**
```
tests/integration/api.test.ts
    ↓ imports
api/process.ts (Vercel serverless function)
    ↓ dynamically imports at runtime
backend/dist/src/handlers/processReceipt.js
    ↑
    Must exist as a physical file!
```

- Tests import API handlers
- API handlers use dynamic imports: `await import('../../backend/dist/...')`
- Dynamic imports require actual files (not handled by Vitest's TypeScript compiler)
- Therefore, backend must be pre-compiled

### Why Not Use Vitest's TypeScript Handling?

**Vitest can compile TypeScript on-the-fly**, but:
- Only for direct imports (`import x from './file'`)
- Not for dynamic imports (`await import('./file')`)
- Not for runtime path resolution

**Our API functions use dynamic imports:**
```typescript
// This requires a real file at runtime
const { processReceipt } = await import('../../backend/dist/src/handlers/processReceipt.js');
```

### npm Lifecycle Scripts

npm has built-in lifecycle scripts:
- `pretest` - runs before `test`
- `posttest` - runs after `test`
- `prebuild` - runs before `build`
- etc.

We use `pretest` to ensure automatic build before tests.

## Best Practices

### For Developers

1. **Always use `npm test`** - Never run Vitest directly
2. **Clean rebuild if needed** - `rm -rf backend/dist && npm test`
3. **Check pre-test output** - It tells you what's being built
4. **Read error messages** - They guide you to the fix

### For CI/CD

1. **Single command** - `npm test` does everything
2. **No caching needed** - Script handles dependencies
3. **Clear exit codes** - Non-zero on failure
4. **Verbose output** - Easy to debug in logs

### For New Contributors

**Getting started with tests:**
```bash
# Clone repo
git clone <repo-url>
cd SmartReceiptReader

# Install dependencies
npm install

# Run tests (builds automatically)
npm test
```

That's it! No manual build steps needed.

## Summary

The test setup ensures:
- ✅ All dependencies installed
- ✅ Backend compiled before tests run
- ✅ Clear feedback during build process
- ✅ Fast fail with helpful errors
- ✅ Works automatically without manual steps
- ✅ Same behavior locally and in CI/CD

**Just run `npm test` and everything works!** 🎉

## Playwright E2E Tests

### Overview

The project includes a comprehensive Playwright-based E2E test suite for browser automation testing. These tests are located in `tests/e2e/playwright/` and provide full end-to-end testing of the application UI and workflows.

### Quick Start

**Windows (PowerShell):**
```powershell
# Navigate to playwright directory
cd tests\e2e\playwright

# First time setup (creates .venv and installs dependencies)
.\setup.ps1

# Run tests with automated server management
.\run-e2e-tests.ps1
```

**Mac/Linux (Bash):**
```bash
# Navigate to playwright directory
cd tests/e2e/playwright

# First time setup (creates .venv and installs dependencies)
./setup.sh

# Run tests with automated server management
./run-e2e-tests.sh
```

### Automated Test Runner

The `run-e2e-tests` scripts automatically handle:
- ✅ Checking if dev server is running
- ✅ Starting server if needed
- ✅ Waiting for server to be ready
- ✅ Running Playwright tests
- ✅ Stopping server after tests (optional)

### Common Usage Examples

**Run all tests (headless):**
```powershell
# Windows
.\run-e2e-tests.ps1

# Mac/Linux
./run-e2e-tests.sh
```

**Run with visible browser:**
```powershell
# Windows
.\run-e2e-tests.ps1 -Headed

# Mac/Linux
./run-e2e-tests.sh --headed
```

**Run specific test file:**
```powershell
# Windows
.\run-e2e-tests.ps1 -TestPath "tests/test_health.py"

# Mac/Linux
./run-e2e-tests.sh --test-path "tests/test_health.py"
```

**Keep server running for faster subsequent runs:**
```powershell
# Windows
.\run-e2e-tests.ps1 -Headed -KeepServerRunning

# Mac/Linux
./run-e2e-tests.sh --headed --keep-server
```

**Use different browser:**
```powershell
# Windows
.\run-e2e-tests.ps1 -Browser "firefox"

# Mac/Linux
./run-e2e-tests.sh --browser firefox
```

### Test Suite Coverage

The Playwright tests include:
- **Health Checks** (`test_health.py`) - Application and API health
- **Manual Receipt Entry** (`test_manual_receipt.py`) - Manual form submission
- **Full Workflow** (`test_full_workflow.py`) - Complete user journeys
- **API Error Handling** (`test_api_errors.py`) - Error scenarios and validation
- **Page Object Models** (`test_page_objects.py`) - Maintainable page patterns

### Virtual Environment Location

The Python virtual environment (`.venv`) is located in `tests/e2e/playwright/.venv/` (not in the project root). This keeps the E2E test dependencies isolated from the main project.

**If you have a misplaced .venv in the project root:**
```powershell
# Windows
cd tests\e2e\playwright
.\fix-venv-location.ps1

# Mac/Linux
cd tests/e2e/playwright
./fix-venv-location.sh  # (if available, or manually move/delete)
```

### Manual Test Execution

If you need to run tests manually without the automation script:

```bash
# Ensure dev server is running
npm run dev  # In separate terminal

# Activate virtual environment and run tests
# Windows:
tests\e2e\playwright\.venv\Scripts\Activate.ps1
pytest -v

# Mac/Linux:
source tests/e2e/playwright/.venv/bin/activate
pytest -v
```

### Documentation

Comprehensive documentation is available in `tests/e2e/playwright/`:
- **README.md** - Main documentation and overview
- **GETTING_STARTED.md** - Step-by-step setup guide
- **AUTOMATED_RUNNER.md** - Detailed runner script documentation
- **QUICK_REFERENCE.md** - Quick command reference
- **ARCHITECTURE.md** - Test architecture and patterns
- **VENV_LOCATION_GUIDE.md** - Virtual environment best practices

### Troubleshooting

**Virtual environment not found:**
```bash
# Run setup script first
cd tests/e2e/playwright
.\setup.ps1  # Windows
./setup.sh   # Mac/Linux
```

**Server won't start:**
- Check if port 3000 is already in use
- Try running `npm run dev` manually to see errors
- Ensure all dependencies are installed (`npm install`)

**Browser not found:**
```bash
# Reinstall Playwright browsers
cd tests/e2e/playwright
.\.venv\Scripts\python.exe -m playwright install  # Windows
.venv/bin/python -m playwright install          # Mac/Linux
```

**Tests fail unexpectedly:**
- Ensure dev server is running (`http://localhost:3000`)
- Check API health endpoint (`http://localhost:3000/api/health`)
- Try running with `--headed` flag to see what's happening
- Check test output for specific error messages

---

*For more information, see:*
- `scripts/pre-test-build.js` - Build script implementation
- `tests/setup.ts` - Test environment setup
- `vitest.config.ts` - Test configuration
- `package.json` - Script definitions
