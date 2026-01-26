# Page Object Models (POM) - Documentation

## 📖 Overview

Page Object Models are a design pattern that creates an abstraction layer between your tests and the UI. This makes tests more maintainable, readable, and reusable.

---

## 🎯 Benefits

- ✅ **Maintainability**: UI changes only require updates in one place
- ✅ **Readability**: Tests read like user stories
- ✅ **Reusability**: Common operations can be reused across tests
- ✅ **Reduced duplication**: Selectors and actions defined once
- ✅ **Better organization**: Clear separation of concerns
- ✅ **Easier refactoring**: Change implementation without breaking tests

---

## 📁 Structure

```
pages/
├── base_page.py              # Base class with common functionality
├── home_page.py              # Home/main page operations
├── manual_entry_page.py      # Manual receipt entry form
└── receipt_list_page.py      # Receipt list and filters
```

---

## 🏗️ Architecture

### BasePage (base_page.py)

Base class providing common functionality for all page objects.

**Key Features:**
- Navigation helpers
- Common locator strategies with fallbacks
- Reusable assertions
- Screenshot/video utilities
- Network waiting

**Example Usage:**
```python
from pages.base_page import BasePage

class MyPage(BasePage):
    def __init__(self, page: Page):
        super().__init__(page)
    
    def do_something(self):
        self.click_button("Submit")
        self.assert_text_visible("Success")
```

---

## 📄 Page Objects

### 1. HomePage

**File:** `pages/home_page.py`

**Purpose:** Main application page operations

**Key Methods:**
```python
# Navigation
home.navigate_home()
home.navigate_to_receipts()
home.click_logo()

# Primary actions
home.click_manual_entry()
home.click_upload()
home.click_export()

# Upload
home.upload_file("path/to/file.jpg")
home.cancel_upload()

# Export
home.export_as_csv()
home.export_as_pdf()

# Assertions
home.assert_on_home_page()
home.assert_manual_entry_available()
home.assert_upload_modal_opened()
```

**Example Test:**
```python
def test_homepage(page: Page):
    home = HomePage(page)
    home.navigate_home()
    home.assert_manual_entry_available()
    home.click_manual_entry()
```

---

### 2. ManualEntryPage

**File:** `pages/manual_entry_page.py`

**Purpose:** Manual receipt entry form operations

**Key Methods:**
```python
# Form operations
manual_entry.open_form()
manual_entry.fill_merchant_name("Store")
manual_entry.fill_date("2026-01-26")
manual_entry.fill_total("50.00")
manual_entry.select_currency("USD")
manual_entry.select_category("Groceries")
manual_entry.fill_notes("Weekly shopping")
manual_entry.submit_form()
manual_entry.cancel_form()

# Compound action (all-in-one)
manual_entry.create_receipt(
    merchant="Store",
    date="2026-01-26",
    total="50.00",
    currency="USD",
    category="Groceries",
    notes="Optional notes"
)

# State checks
is_open = manual_entry.is_form_visible()
error = manual_entry.get_validation_error()

# Assertions
manual_entry.assert_form_opened()
manual_entry.assert_form_closed()
manual_entry.assert_validation_error_shown()
```

**Example Test:**
```python
def test_manual_entry(page: Page):
    manual_entry = ManualEntryPage(page)
    
    # Method 1: Step by step
    manual_entry.open_form()
    manual_entry.fill_merchant_name("Coffee Shop")
    manual_entry.fill_date("2026-01-26")
    manual_entry.fill_total("15.50")
    manual_entry.submit_form()
    
    # Method 2: One-liner
    manual_entry.create_receipt("Coffee Shop", "2026-01-26", "15.50")
    
    # Method 3: Fluent API
    (manual_entry
        .open_form()
        .fill_merchant_name("Coffee Shop")
        .fill_date("2026-01-26")
        .fill_total("15.50")
        .submit_form())
```

---

### 3. ReceiptListPage

**File:** `pages/receipt_list_page.py`

**Purpose:** Receipt list, search, filter operations

**Key Methods:**
```python
# List operations
count = receipt_list.get_receipt_count()
merchants = receipt_list.get_receipt_merchants()
receipt = receipt_list.get_receipt_by_merchant("Store")

# CRUD operations
receipt_list.delete_receipt_by_merchant("Store")
receipt_list.edit_receipt_by_merchant("Store")

# Search and filters
receipt_list.search("coffee")
receipt_list.clear_search()
receipt_list.filter_by_merchant("Walmart")
receipt_list.filter_by_date_range("2026-01-01", "2026-01-31")
receipt_list.filter_by_category("Groceries")
receipt_list.clear_filters()

# Stats
total = receipt_list.get_total_receipts_stat()
amount = receipt_list.get_total_amount_stat()
visible = receipt_list.is_stats_visible()

# State
is_empty = receipt_list.is_empty()
has_receipts = receipt_list.has_receipts()
receipt_list.wait_for_receipts_to_load()

# Assertions
receipt_list.assert_receipt_exists("Store")
receipt_list.assert_receipt_not_exists("Store")
receipt_list.assert_receipt_count(5)
receipt_list.assert_empty_state_shown()
receipt_list.assert_filtered_results(["Store A", "Store B"])
```

**Example Test:**
```python
def test_receipt_list(page: Page):
    receipt_list = ReceiptListPage(page)
    
    # Wait for load
    receipt_list.wait_for_receipts_to_load()
    
    # Get info
    count = receipt_list.get_receipt_count()
    print(f"Found {count} receipts")
    
    # Search
    receipt_list.search("coffee")
    receipt_list.assert_receipt_exists("Coffee Shop")
    
    # Delete
    receipt_list.delete_receipt_by_merchant("Coffee Shop")
    receipt_list.assert_receipt_not_exists("Coffee Shop")
```

---

## 🎨 Usage Patterns

### Pattern 1: Basic Test

```python
def test_basic(page: Page):
    home = HomePage(page)
    manual_entry = ManualEntryPage(page)
    receipt_list = ReceiptListPage(page)
    
    home.navigate_home()
    manual_entry.create_receipt("Store", "2026-01-26", "50.00")
    receipt_list.assert_receipt_exists("Store")
```

### Pattern 2: Fluent API (Method Chaining)

```python
def test_fluent(page: Page):
    (ManualEntryPage(page)
        .open_form()
        .fill_merchant_name("Store")
        .fill_date("2026-01-26")
        .fill_total("50.00")
        .submit_form())
    
    (ReceiptListPage(page)
        .wait_for_receipts_to_load()
        .assert_receipt_exists("Store")
        .delete_receipt_by_merchant("Store")
        .assert_receipt_not_exists("Store"))
```

### Pattern 3: Using Fixtures

```python
@pytest.fixture
def home_page(page: Page) -> HomePage:
    return HomePage(page)

@pytest.fixture
def manual_entry_page(page: Page) -> ManualEntryPage:
    return ManualEntryPage(page)

def test_with_fixtures(home_page: HomePage, manual_entry_page: ManualEntryPage):
    home_page.navigate_home()
    manual_entry_page.create_receipt("Store", "2026-01-26", "50.00")
```

### Pattern 4: Reusable Helpers

```python
# In conftest.py or helper module
def create_test_receipt(manual_entry: ManualEntryPage, merchant: str):
    """Helper to create receipt with defaults"""
    manual_entry.create_receipt(
        merchant=merchant,
        date="2026-01-26",
        total="50.00",
        currency="USD"
    )

# In test
def test_with_helper(page: Page):
    manual_entry = ManualEntryPage(page)
    create_test_receipt(manual_entry, "Test Store")
```

---

## ✅ Best Practices

### 1. Keep Page Objects UI-Focused

**✅ Good:**
```python
class ManualEntryPage(BasePage):
    def fill_merchant_name(self, merchant: str):
        self.page.locator(self.MERCHANT_INPUT).fill(merchant)
        return self
```

**❌ Avoid:**
```python
class ManualEntryPage(BasePage):
    def validate_merchant_format(self, merchant: str):
        # Business logic doesn't belong here
        if not merchant or len(merchant) < 3:
            raise ValueError("Invalid merchant")
```

### 2. Use Method Chaining

**✅ Good:**
```python
def submit_form(self):
    self.page.locator(self.SUBMIT_BUTTON).click()
    return self  # Enable chaining
```

### 3. Provide Multiple Ways to Interact

```python
# Simple form filling
manual_entry.open_form()
manual_entry.fill_merchant_name("Store")
manual_entry.submit_form()

# OR compound action
manual_entry.create_receipt("Store", "2026-01-26", "50.00")

# OR fluent API
manual_entry.open_form().fill_merchant_name("Store").submit_form()
```

### 4. Use Fallback Selectors

```python
# Multiple selector strategies
MERCHANT_INPUT = "input[name='merchantName'], #merchantName"
DELETE_BUTTON = "button:has-text('Delete'), button[aria-label='Delete']"
```

### 5. Include Assertions in Page Objects

```python
def assert_receipt_exists(self, merchant: str):
    expect(self.page.locator(f"text={merchant}")).to_be_visible()
    return self
```

### 6. Keep Tests Simple

**✅ Good:**
```python
def test_create_receipt(page: Page):
    manual_entry = ManualEntryPage(page)
    receipt_list = ReceiptListPage(page)
    
    manual_entry.create_receipt("Store", "2026-01-26", "50.00")
    receipt_list.assert_receipt_exists("Store")
```

**❌ Avoid:**
```python
def test_everything(page: Page):
    # Don't test multiple unrelated features in one test
    # Create 10 receipts, test filters, test delete, test export...
```

---

## 🔧 Extending Page Objects

### Adding New Page Objects

1. **Create file** in `pages/` directory
2. **Inherit from BasePage**
3. **Define selectors** as class constants
4. **Add methods** for user actions
5. **Add assertions** for verifications

**Example:**
```python
# pages/settings_page.py
from playwright.sync_api import Page, expect
from .base_page import BasePage

class SettingsPage(BasePage):
    # Selectors
    THEME_SELECT = "#theme, select[name='theme']"
    SAVE_BUTTON = "button:has-text('Save')"
    
    def __init__(self, page: Page):
        super().__init__(page)
    
    def change_theme(self, theme: str):
        """Change application theme"""
        self.page.locator(self.THEME_SELECT).select_option(theme)
        self.page.locator(self.SAVE_BUTTON).click()
        return self
    
    def assert_theme_changed(self, theme: str):
        """Assert theme was changed"""
        expect(self.page.locator(self.THEME_SELECT)).to_have_value(theme)
        return self
```

### Adding Methods to Existing Pages

```python
# pages/receipt_list_page.py
class ReceiptListPage(BasePage):
    # ...existing code...
    
    def sort_by_date(self, order: str = "desc"):
        """Sort receipts by date"""
        sort_button = self.page.locator("button:has-text('Sort')")
        sort_button.click()
        
        order_option = self.page.locator(f"text={order}")
        order_option.click()
        return self
```

---

## 🧪 Testing Page Objects

It's generally not necessary to test page objects themselves (they're tested through E2E tests), but you can if needed:

```python
def test_page_object_methods():
    """Test page object behavior (unit-style)"""
    # This is optional and usually not recommended
    # Page objects are tested implicitly through E2E tests
    pass
```

---

## 📊 Migration Guide

### Converting Existing Tests to Page Objects

**Before:**
```python
def test_create_receipt(page: Page):
    page.locator("button:has-text('Manual')").first.click()
    page.fill("input[name='merchantName']", "Store")
    page.fill("input[name='date']", "2026-01-26")
    page.fill("input[name='total']", "50.00")
    page.locator("button[type='submit']").click()
    expect(page.locator("text=Store")).to_be_visible()
```

**After:**
```python
def test_create_receipt(page: Page):
    manual_entry = ManualEntryPage(page)
    receipt_list = ReceiptListPage(page)
    
    manual_entry.create_receipt("Store", "2026-01-26", "50.00")
    receipt_list.assert_receipt_exists("Store")
```

---

## 🎯 When to Use Page Objects

**✅ Use When:**
- Building maintainable test suites
- Multiple tests interact with same UI
- UI changes frequently
- Tests become hard to read
- Working on long-term projects

**⚠️ Consider Alternatives When:**
- Very simple, one-off tests
- Rapid prototyping
- Quick smoke tests
- UI is extremely stable

---

## 📚 Examples

See `tests/test_page_objects.py` for comprehensive examples of:
- Basic CRUD operations
- Search and filtering
- Form validation
- Fluent API usage
- Bulk operations
- Error handling
- Using fixtures with page objects

---

## 🔗 Resources

- **Example Tests:** `tests/test_page_objects.py`
- **Base Page:** `pages/base_page.py`
- **Playwright Docs:** https://playwright.dev/python/docs/pom
- **Main README:** `../README.md`

---

**Happy Testing with Page Objects! 🎭**

*Last updated: January 26, 2026*
