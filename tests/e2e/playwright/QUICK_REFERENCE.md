# Playwright E2E Testing - Quick Reference Card

> **Quick access guide for common Playwright E2E testing tasks**

---

## 🚀 Quick Start Commands

```powershell
# Setup (first time only)
cd tests/e2e/playwright
.\setup.ps1

# Activate environment
.\.venv\Scripts\Activate.ps1

# Run all tests
pytest

# Run specific test
pytest tests/test_manual_receipt.py

# Run with visible browser
pytest --headed

# Run on all browsers
pytest --browser chromium --browser firefox --browser webkit
```

---

## 📝 Common Test Patterns

### Create Receipt
```python
def test_create_receipt(page: Page):
    page.locator("button:has-text('Manual')").first.click()
    page.fill("input[name='merchantName']", "Test Store")
    page.fill("input[name='date']", "2026-01-26")
    page.fill("input[name='total']", "50.00")
    page.locator("button[type='submit']").click()
    expect(page.locator("text=Test Store")).to_be_visible()
```

### Delete Receipt
```python
def test_delete_receipt(page: Page):
    receipt_row = page.locator("text=Test Store").locator("..")
    receipt_row.locator("button:has-text('Delete')").click()
    # Handle confirmation if exists
    page.locator("button:has-text('Confirm')").click(timeout=2000)
    expect(page.locator("text=Test Store")).not_to_be_visible()
```

### Search/Filter
```python
def test_search(page: Page):
    page.locator("input[type='search']").fill("Coffee")
    expect(page.locator("text=Coffee Shop")).to_be_visible()
    expect(page.locator("text=Hardware Store")).not_to_be_visible()
```

### Upload File
```python
def test_upload(page: Page):
    page.locator("button:has-text('Upload')").click()
    page.set_input_files("input[type='file']", "fixtures/receipt.jpg")
    expect(page.locator("text=Upload successful")).to_be_visible()
```

---

## 🎯 Key Selectors

```python
# Manual Entry
MANUAL_BUTTON = "button:has-text('Manual')"
MERCHANT_INPUT = "input[name='merchantName'], #merchantName"
DATE_INPUT = "input[name='date'], input[type='date']"
TOTAL_INPUT = "input[name='total'], #total"
SUBMIT_BUTTON = "button[type='submit']"

# Receipt List
RECEIPT_ROW = ".receipt-row, [data-testid='receipt-item']"
DELETE_BUTTON = "button:has-text('Delete')"

# Search
SEARCH_INPUT = "input[type='search'], input[placeholder*='Search']"

# Upload
FILE_INPUT = "input[type='file']"
UPLOAD_BUTTON = "button:has-text('Upload')"
```

---

## 🔍 Debugging Commands

```powershell
# Run with inspector (pauses execution)
pytest --headed --slowmo 1000

# Enable traces
pytest --tracing on

# View trace
playwright show-trace test-results/.../trace.zip

# Generate HTML report
pytest --html=report.html

# Verbose output
pytest -v -s
```

---

## 🧪 Assertions

```python
# Visibility
expect(element).to_be_visible()
expect(element).not_to_be_visible()
expect(element).to_be_hidden()

# Content
expect(element).to_have_text("Expected text")
expect(element).to_contain_text("Partial text")

# Attributes
expect(element).to_have_attribute("href", "https://...")
expect(element).to_have_class("active")

# Count
expect(page.locator(".receipt-row")).to_have_count(5)

# Value
expect(input).to_have_value("test@example.com")

# Enabled/Disabled
expect(button).to_be_enabled()
expect(button).to_be_disabled()
```

---

## 🌐 Multi-Browser Testing

```powershell
# Single browser
pytest --browser chromium

# Multiple browsers
pytest --browser chromium --browser firefox

# All browsers
pytest --browser chromium --browser firefox --browser webkit

# Mobile emulation
# (Add to conftest.py)
context = browser.new_context(**playwright.devices['iPhone 13'])
```

---

## 🎭 Fixtures (conftest.py)

```python
# Available fixtures
def test_example(
    page,                  # Playwright page, auto-navigates to base_url
    api_page,              # Page without auto-navigation
    base_url,              # http://localhost:3000
    api_url,               # http://localhost:3000/api
    sample_receipt_data,   # Dict with test receipt data
    sample_receipt_image,  # Path to sample image
    mock_receipts,         # Mocked API responses
):
    pass
```

---

## 📸 Screenshots & Videos

```python
# Manual screenshot
page.screenshot(path="screenshot.png")
page.screenshot(path="full-page.png", full_page=True)

# Automatic (on failure)
# Already configured in pytest.ini

# Record video
# Set RECORD_VIDEO=true in .env
# Videos saved to test-results/videos/
```

---

## 🔄 Waiting Strategies

```python
# Auto-wait (recommended)
expect(element).to_be_visible()

# Wait for selector
page.wait_for_selector(".receipt-row", timeout=5000)

# Wait for URL
page.wait_for_url("**/receipts")

# Wait for network
with page.expect_response("**/api/receipts") as response:
    page.click("#submit")
print(response.value.json())

# Wait for navigation
with page.expect_navigation():
    page.click("a[href='/receipts']")

# Manual timeout (avoid if possible)
page.wait_for_timeout(1000)
```

---

## 🎨 Custom Helpers

```python
# Create in conftest.py or separate file
def create_test_receipt(page: Page, merchant: str, total: str):
    """Helper to create receipt"""
    page.locator("button:has-text('Manual')").first.click()
    page.fill("input[name='merchantName']", merchant)
    page.fill("input[name='date']", "2026-01-26")
    page.fill("input[name='total']", total)
    page.locator("button[type='submit']").click()

def get_receipt_count(page: Page) -> int:
    """Get number of receipts in list"""
    return page.locator(".receipt-row").count()

# Use in tests
def test_with_helper(page: Page):
    create_test_receipt(page, "Store", "50.00")
    assert get_receipt_count(page) > 0
```

---

## 🔧 Configuration Tips

### .env file
```ini
BASE_URL=http://localhost:3000
HEADLESS=false
SLOWMO=500
SCREENSHOT_ON_FAILURE=true
```

### pytest.ini
```ini
[pytest]
addopts = 
    --browser chromium
    --headed
    --tracing retain-on-failure
```

---

## 🚦 Test Organization

```python
# Group related tests
class TestManualEntry:
    def test_open_form(self, page): pass
    def test_submit_form(self, page): pass
    def test_cancel_form(self, page): pass

class TestReceiptList:
    def test_view_list(self, page): pass
    def test_filter_list(self, page): pass
    def test_delete_receipt(self, page): pass

# Mark slow tests
@pytest.mark.slow
def test_long_operation(page): pass

# Skip conditionally
@pytest.mark.skipif(condition, reason="...")
def test_conditional(page): pass

# Parametrize
@pytest.mark.parametrize("merchant,total", [
    ("Store A", "10.00"),
    ("Store B", "20.00"),
])
def test_multiple_receipts(page, merchant, total): pass
```

---

## 🔒 API Mocking

```python
# Mock specific endpoint
page.route("**/api/receipts", lambda route: route.fulfill(
    status=200,
    json=[{"id": "1", "merchantName": "Mock", "total": 50}]
))

# Mock all API calls
page.route("**/api/**", lambda route: route.fulfill(status=200, json={}))

# Intercept and modify
def handle_route(route):
    response = route.fetch()
    data = response.json()
    data['modified'] = True
    route.fulfill(response=response, json=data)

page.route("**/api/receipts", handle_route)

# Abort requests (e.g., block analytics)
page.route("**/analytics/**", lambda route: route.abort())
```

---

## 🎯 CI/CD Integration

### GitHub Actions
```yaml
# Already configured in .github/workflows/e2e-playwright.yml

# Manual trigger:
# GitHub → Actions → E2E Tests → Run workflow
```

### Local pre-commit check
```powershell
# Run before pushing
pytest --browser chromium -x  # Stop on first failure
```

---

## 🐛 Troubleshooting

### Tests fail locally
```powershell
# Ensure dev server is running
npm run dev  # In project root

# Check environment
cat .env

# Run with verbose output
pytest -v -s --headed
```

### Selector not found
```python
# Use multiple fallbacks
page.locator("input[name='field']").or_(page.locator("#field"))

# Increase timeout
expect(element).to_be_visible(timeout=10000)

# Debug with pause
page.pause()
```

### Flaky tests
```python
# Use auto-waiting instead of sleep
expect(element).to_be_visible()  # ✅
page.wait_for_timeout(1000)       # ❌

# Wait for network
page.wait_for_load_state("networkidle")

# Retry flaky operations
for _ in range(3):
    try:
        element.click()
        break
    except:
        page.wait_for_timeout(500)
```

---

## ✅ Pre-Test Checklist

- [ ] Virtual environment activated (`.venv`)
- [ ] Dev server running (`npm run dev`)
- [ ] Environment variables set (`.env`)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Browsers installed (`playwright install`)

---

**Happy Testing! 🎭**

*Quick Reference Card - v1.0 - Jan 2026*
