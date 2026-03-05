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

## Running Tests

### Quick Start

**Note:** Tests run in **headless mode** by default (no visible browser). Use `--headed` to see the browser during test execution.

```bash
# Run all tests (headless by default)
pytest tests/e2e/playwright/

# Run specific test file
pytest tests/e2e/playwright/tests/test_health.py

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

# Test user (if authentication added)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Test data
TEST_RECEIPT_IMAGE=tests/fixtures/sample-receipt.png

# Browser settings
HEADLESS=true
SLOW_MO=0
```

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
    # Mock API response
    page.route("**/api/receipts", lambda route: route.fulfill(
        status=200,
        body='[{"id": "123", "merchantName": "Test Store", "total": 50.00}]'
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
