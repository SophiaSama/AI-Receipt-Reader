# End-to-End Testing with Python Playwright

This directory contains E2E tests using Python Playwright for the SmartReceiptReader application.

## Why Python Playwright?

- **Cross-browser testing** - Test on Chromium, Firefox, and WebKit
- **Auto-waiting** - Smart waits for elements to be ready
- **Network interception** - Mock API responses
- **Screenshots & videos** - Automatic failure capture
- **Parallel execution** - Fast test runs
- **Python ecosystem** - Easy integration with pytest
- **Page Object Models** - Maintainable test architecture

## Setup

### 1. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install playwright pytest pytest-playwright pytest-asyncio python-dotenv

# Install browsers
playwright install
```

### 2. Project Structure

```
tests/e2e/playwright/
├── 📄 README.md                         # This file
├── 📁 tests/doc/                         # E2E documentation
│   ├── TESTING_QUICK_REFERENCE.md        # Quick reference card
│   ├── SERVER_REQUIREMENTS.md            # Server setup requirements
│   ├── AUTOMATED_RUNNER.md               # Runner scripts usage
│   └── ARCHITECTURE.md                   # Playwright architecture
│
├── ⚙️ requirements.txt                  # Python dependencies
├── ⚙️ pytest.ini                        # Pytest configuration
├── ⚙️ conftest.py                       # Shared fixtures and config
├── 📋 .env.example                      # Environment template
│
├── 🔧 setup.py                          # Python setup script
├── 🔧 setup.sh                          # Bash setup script (Mac/Linux)
├── 🔧 setup.ps1                         # PowerShell setup script (Windows)
│
├── 🚀 run-e2e-tests.sh                  # Automated test runner (Mac/Linux)
├── 🚀 run-e2e-tests.ps1                 # Automated test runner (Windows)
│
├── 📁 .venv/                            # Python virtual environment
│
├── tests/                               # Test files
│   ├── test_health.py                  # Health check tests
│   ├── test_manual_receipt.py          # Manual entry tests
│   ├── test_duplicate_upload.py         # Duplicate upload confirmation
│   ├── test_full_workflow.py           # Complete workflows
│   ├── test_api_errors.py              # API error handling tests
│   ├── test_page_objects.py            # POM usage examples
│   │
│   └── fixtures/                        # Test data and assets
│       └── sample-receipt.png           # Sample receipt image for upload tests
│
└── pages/                               # Page Object Models
    ├── README.md                        # POM documentation
    ├── __init__.py                      # Package init
    ├── base_page.py                     # Base POM class
    ├── home_page.py                     # Home page
    ├── manual_entry_page.py             # Manual entry form
    └── receipt_list_page.py             # Receipt list & filters
```

## Running E2E locally against a local Supabase stack (Option A)

The suite is auth-gated: almost every test signs in as a seeded Supabase user
before exercising the UI. Locally we use a **disposable local Supabase stack**
(the same approach CI uses) so the seeded users in
[`supabase/seed.sql`](../../../supabase/seed.sql) can log in. That stack runs in
Docker, which in turn requires hardware **virtualization**.

### Prerequisites (Docker + virtualization)

The local Supabase stack runs entirely in Docker containers, so you need:

1. **Hardware virtualization enabled in firmware/BIOS** — Intel **VT-x** or
   AMD **SVM**. On managed/corporate machines this is often disabled and must be
   turned on by IT.
2. **Windows virtualization features** — **Virtual Machine Platform** and
   **WSL 2** (Docker Desktop's default backend).
3. **Docker Desktop** installed and showing **Engine running**.

Verify virtualization is on before installing anything:

- **Task Manager → Performance → CPU →** the **Virtualization** line should read
  **Enabled**.
- Or in PowerShell: `Get-ComputerInfo -Property "HyperVRequirement*"`.

Enable the Windows features (admin PowerShell), then reboot:

```powershell
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
wsl --install --no-distribution   # installs/updates the WSL2 kernel
```

> **"Docker Desktop failed to start because virtualisation support wasn't
> detected."** Virtualization is off in BIOS (or blocked by IT policy), or the
> Virtual Machine Platform / WSL 2 features are missing. Without it, the local
> stack cannot run — either enable virtualization (above) or run the suite in
> **GitHub Actions**, which already provisions the local Supabase stack on the
> runner (see [`.github/workflows/e2e-playwright.yml`](../../../.github/workflows/e2e-playwright.yml)).

### One-time: install the Supabase CLI

The CLI ships as a dev dependency, so `npx supabase ...` works from the repo
root. (Standalone install: <https://supabase.com/docs/guides/cli>.)

### Step-by-step

Run these from the **repository root** unless noted.

1. **Start Docker Desktop** and wait for **Engine running**.

2. **Start the local Supabase stack** (first run pulls images — give it a few
   minutes):

   ```powershell
   npx supabase start
   ```

3. **Apply the schema + seed the test users** (idempotent; re-runs
   `migrations/0001_init.sql` + `seed.sql`, which creates `test-user-a/b` with
   email confirmation disabled):

   ```powershell
   npx supabase db reset
   ```

4. **Read the local keys** and confirm they match the values committed in
   `.env.test` / the playwright `.env`:

   ```powershell
   npx supabase status -o env
   # API_URL=http://127.0.0.1:54321
   # ANON_KEY=...           -> VITE_SUPABASE_PUBLISHABLE_KEY / SUPABASE_PUBLISHABLE_KEY
   # SERVICE_ROLE_KEY=...   -> SUPABASE_SERVICE_ROLE_KEY (playwright .env only)
   ```

   The committed defaults are the standard local dev keys. If your CLI emits
   different values, paste `ANON_KEY` into both
   [`.env.test`](../../../.env.test) and `tests/e2e/playwright/.env`, and
   `SERVICE_ROLE_KEY` into `tests/e2e/playwright/.env`.

5. **Start the app pointed at local Supabase.** Use the dedicated e2e script so
   your normal `npm run dev` keeps using your cloud config:

   ```powershell
   # frontend -> reads .env.test (VITE_SUPABASE_* = local stack), serves :3000
   npm run dev:e2e

   # backend (separate terminal), serves :3001
   cd backend; npm run dev
   ```

   `npm run dev:e2e` is `vite --mode test`, which loads
   [`.env.test`](../../../.env.test) and overrides the cloud values in `.env`
   for the e2e session only.

6. **Run the suite** from this directory using the venv:

   ```powershell
   cd tests/e2e/playwright
   .\.venv\Scripts\python.exe -m pytest --browser chromium
   ```

### How the env files map

| File | Used by | Supabase target |
| --- | --- | --- |
| [`.env.test`](../../../.env.test) (root) | Frontend via `npm run dev:e2e` (`VITE_SUPABASE_*`) | Local stack `127.0.0.1:54321` |
| `tests/e2e/playwright/.env` | pytest / fixtures (`SUPABASE_*`, `E2E_USER_*`) | Local stack `127.0.0.1:54321` |
| `.env` / `.env.local` (root) | Normal `npm run dev` | Your cloud project (unchanged) |

### Tearing down

```powershell
npx supabase stop          # stop containers (keeps data)
npx supabase stop --no-backup   # stop and discard local data
```

## Running Tests

### Quick Start

**Note:** Tests run in **headless mode** by default (no visible browser). Use `--headed` to see the browser during test execution.

```bash
# Run all tests (headless by default)
pytest tests/e2e/playwright/

# Run specific test file
pytest tests/e2e/playwright/tests/test_health.py

# Run duplicate-upload flow tests
pytest tests/e2e/playwright/tests/test_duplicate_upload.py

# Run with specific browser
pytest --browser chromium
pytest --browser firefox
pytest --browser webkit

# Run in headed mode (see browser - useful for debugging)
pytest --headed

# Run with traces (debugging)
pytest --tracing on

# Run in parallel
pytest -n auto
```

### Automated Runner Scripts

Use the helper scripts to start the dev server, wait for readiness, and run tests:

```powershell
# Windows (PowerShell)
.\tests\e2e\playwright\run-e2e-tests.ps1
```

```bash
# Mac/Linux
./tests/e2e/playwright/run-e2e-tests.sh
```

See `tests/e2e/playwright/tests/doc/AUTOMATED_RUNNER.md` for all options.

### Advanced Options

```bash
# Run with slow motion (for debugging)
pytest --slowmo 1000

# Generate HTML report
pytest --html=report.html

# Run specific test
pytest -k "test_manual_entry"

# Run with video recording
pytest --video on

# Run with screenshot on failure
pytest --screenshot on
```

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Application URL
BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# Optional API forwarding
# If you run the backend separately (e.g. `BACKEND_ORIGIN=http://localhost:3001`),
# you can forward the browser's /api/* calls to that origin.
FORWARD_API_TO_BACKEND=false
BACKEND_ORIGIN=http://localhost:3001

# Supabase (local stack defaults shown)
SUPABASE_URL=http://localhost:54321
SUPABASE_PUBLISHABLE_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# Seeded test users (see supabase/seed.sql)
E2E_USER_A_EMAIL=test-user-a@example.com
E2E_USER_A_PASSWORD=test-password-a
E2E_USER_B_EMAIL=test-user-b@example.com
E2E_USER_B_PASSWORD=test-password-b

# Test data
TEST_RECEIPT_IMAGE=tests/fixtures/sample-receipt.png

# Browser settings
HEADLESS=true
SLOW_MO=0

# Video recording (set to true to enable)
RECORD_VIDEO=false
```

> **CI vs. local — do I need to fill these in?**
>
> - **CI:** No. The workflow boots a disposable Supabase stack and derives
>   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
>   automatically via `supabase status -o env` — no GitHub secrets are required.
> - **Local:** Use the **local Supabase stack** (Option A) described in
>   ["Running E2E locally against a local Supabase stack"](#running-e2e-locally-against-a-local-supabase-stack-option-a)
>   above — `npx supabase start` provides `SUPABASE_URL` and the keys, and
>   `db reset` seeds `test-user-a/b`. The committed `.env.test` / `.env`
>   defaults already match this stack. (You *can* instead point these at a cloud
>   Supabase project, but the local stack needs no secrets.) If you don't run
>   e2e locally at all, you can leave `SUPABASE_PUBLISHABLE_KEY` and
>   `SUPABASE_SERVICE_ROLE_KEY` **empty** — the publishable key is only needed
>   for login, and the service-role key only powers the between-test cleanup
>   fixture (a silent no-op when empty). They are read solely when pytest runs;
>   leaving them empty never affects CI or the app.

### pytest.ini

Configuration for pytest:

```ini
[pytest]
addopts = 
    --browser chromium
    --browser firefox
    --headed
    --slowmo 0
    --screenshot only-on-failure
    --video retain-on-failure
    --tracing retain-on-failure
    -v
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

## Writing Tests

### Basic Test Example

```python
import pytest
from playwright.sync_api import Page, expect

def test_app_loads(page: Page):
    """Test that the app loads successfully"""
    page.goto("http://localhost:3000")
    
    # Check title
    expect(page).to_have_title("SmartReceipt")
    
    # Check main heading is visible
    heading = page.locator("h1")
    expect(heading).to_be_visible()
```

### Page Object Model Example

```python
# pages/manual_entry_page.py
class ManualEntryPage:
    def __init__(self, page: Page):
        self.page = page
        self.merchant_input = page.locator("#merchantName")
        self.date_input = page.locator("#date")
        self.total_input = page.locator("#total")
        self.submit_button = page.locator("button[type='submit']")
    
    def fill_receipt(self, merchant: str, date: str, total: float):
        self.merchant_input.fill(merchant)
        self.date_input.fill(date)
        self.total_input.fill(str(total))
    
    def submit(self):
        self.submit_button.click()

# Test using page object
def test_manual_entry(page: Page):
    manual_page = ManualEntryPage(page)
    manual_page.fill_receipt("Test Store", "2026-01-26", 50.00)
    manual_page.submit()
    
    # Verify success
    expect(page.locator(".success-message")).to_be_visible()

# Selecting an AI model before upload
def test_upload_with_model(page: Page):
    home = HomePage(page)
    home.select_ai_model("Gemini 2.5 Flash Lite")
    home.upload_file("tests/fixtures/sample-receipt.png")
```

### API Mocking Example

```python
def test_with_mock_api(page: Page):
    # Receipts are fetched directly from Supabase REST (/rest/v1/receipts)
    page.route("**/rest/v1/receipts*", lambda route: route.fulfill(
        status=200,
        body='[{"id": "123", "merchant_name": "Test Store", "total": 50.00}]'
    ))
    
    page.goto("http://localhost:3000")
    
    # Verify mocked data appears
    expect(page.locator("text=Test Store")).to_be_visible()
```

## Test Scenarios

### 1. Health Check

- App loads successfully
- All main sections visible
- No console errors

### 2. Manual Receipt Entry

- Open manual entry form
- Fill all required fields
- Submit successfully
- Receipt appears in list

### 3. Receipt Upload

- Select image file
- Upload processes
- OCR extracts data
- Receipt saved

### 4. Receipt List

- Receipts display
- Filter by merchant
- Filter by date range
- Search functionality

### 5. Full Workflow

- Create manual receipt
- Verify in list
- Delete receipt
- Confirm deletion

### 6. Duplicate Upload Confirmation

- Upload a receipt twice
- App detects possible duplicate after OCR
- User chooses:
    - **Yes (duplicate) — ignore** → does not add a new record
    - **No — add new expense** → proceeds and adds the new record

## Debugging

### View Test Traces

```bash
# Generate trace
pytest --tracing on

# View trace (opens in browser)
playwright show-trace trace.zip
```

### Debug Mode

```python
# Add breakpoint in test
def test_debug(page: Page):
    page.goto("http://localhost:3000")
    page.pause()  # Opens Playwright Inspector
    # Test continues after you resume
```

### Screenshots

```python
# Take screenshot manually
page.screenshot(path="debug.png")

# Screenshot full page
page.screenshot(path="full-page.png", full_page=True)
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Set up Python
  uses: actions/setup-python@v4
  with:
    python-version: '3.11'

- name: Install dependencies
  run: |
    pip install -r tests/e2e/playwright/requirements.txt
    playwright install --with-deps

- name: Run E2E tests
  run: pytest tests/e2e/playwright/
  env:
    BASE_URL: http://localhost:3000
```

## Best Practices

### DO ✅

- Use Page Object Models for reusability
- Use data-testid attributes for stable selectors
- Write independent tests (no dependencies)
- Clean up test data after tests
- Use appropriate waits (auto-waiting)
- Mock external services when needed

### DON'T ❌

- Don't use sleep() - use auto-waiting
- Don't rely on specific timing
- Don't use brittle selectors (like :nth-child)
- Don't test implementation details
- Don't leave debugging code (page.pause())

## Troubleshooting

### Tests fail with "Target closed"

**Cause:** Browser closed unexpectedly  
**Fix:** Check for console errors, increase timeouts

### Element not found

**Cause:** Selector wrong or element not rendered  
**Fix:** Use Playwright Inspector to debug selectors

### Flaky tests

**Cause:** Race conditions, network issues  
**Fix:** Use proper auto-waiting, mock network requests

### Slow tests

**Cause:** Too many network requests  
**Fix:** Mock API responses, use parallel execution

## Resources

- [Playwright Python Docs](https://playwright.dev/python/)
- [Pytest Playwright Plugin](https://github.com/microsoft/playwright-pytest)
- [Best Practices](https://playwright.dev/python/docs/best-practices)
- [Selectors Guide](https://playwright.dev/python/docs/selectors)

---

**Next Steps:**

1. Set up Python virtual environment
2. Install dependencies
3. Create first test
4. Run tests locally
5. Add to CI/CD pipeline
