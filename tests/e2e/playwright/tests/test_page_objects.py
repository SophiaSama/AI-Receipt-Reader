"""
Example E2E tests using Page Object Models
Demonstrates how to use the page objects for cleaner, more maintainable tests
"""
import pytest
from playwright.sync_api import Page
from pages.home_page import HomePage
from pages.manual_entry_page import ManualEntryPage
from pages.receipt_list_page import ReceiptListPage


class TestWithPageObjects:
    """Test examples using Page Object Models"""
    
    def test_create_receipt_with_page_objects(self, page: Page):
        """Test creating a receipt using page objects"""
        # Initialize page objects
        home = HomePage(page)
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Navigate and create receipt
        home.navigate_home()
        manual_entry.create_receipt(
            merchant="Coffee Shop",
            date="2026-01-26",
            total="15.50",
            currency="USD"
        )
        
        # Verify receipt appears in list
        receipt_list.assert_receipt_exists("Coffee Shop")
    
    def test_crud_workflow_with_page_objects(self, page: Page):
        """Test complete CRUD workflow with page objects"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        test_merchant = "Page Object Store"
        
        # CREATE
        manual_entry.create_receipt(
            merchant=test_merchant,
            date="2026-01-26",
            total="100.00"
        )
        
        # Scroll to top where new receipts appear
        page.evaluate("window.scrollTo(0, 0)")
        
        # READ
        receipt_list.wait_for_receipts_to_load(timeout=15000)
        receipt_list.assert_receipt_exists(test_merchant)
        
        # Verify in list of merchants
        merchants = receipt_list.get_receipt_merchants()
        assert test_merchant in merchants, f"Expected '{test_merchant}' in {merchants}"
        
        # DELETE
        receipt_list.delete_receipt_by_merchant(test_merchant)
        receipt_list.assert_receipt_not_exists(test_merchant)
    
    def test_search_functionality(self, page: Page):
        """Test search with page objects"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create test receipts
        manual_entry.create_receipt("Target", "2026-01-26", "50.00")
        manual_entry.create_receipt("Walmart", "2026-01-26", "75.00")
        
        # Search for specific merchant
        receipt_list.search("Target")
        receipt_list.assert_receipt_exists("Target")
        
        # Clear search
        receipt_list.clear_search()
        receipt_list.assert_receipt_exists("Target")
        receipt_list.assert_receipt_exists("Walmart")
    
    def test_filter_by_date_range(self, page: Page):
        """Test date range filtering"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create receipts with different dates
        manual_entry.create_receipt("Store A", "2026-01-15", "50.00")
        manual_entry.create_receipt("Store B", "2026-01-20", "75.00")
        manual_entry.create_receipt("Store C", "2026-01-25", "100.00")
        
        # Filter by date range
        receipt_list.filter_by_date_range(
            date_from="2026-01-18",
            date_to="2026-01-22"
        )
        
        # Should show only Store B
        receipt_list.assert_receipt_exists("Store B")
        # Note: Depending on your implementation, you may need to adjust assertions
    
    def test_form_validation(self, page: Page):
        """Test form validation using page objects"""
        manual_entry = ManualEntryPage(page)
        
        # Open form
        manual_entry.open_form()
        manual_entry.assert_form_opened()
        
        # Try to submit empty form
        manual_entry.submit_form()
        
        # Should show validation errors
        manual_entry.assert_validation_error_shown()
        
        # Form should still be open
        manual_entry.assert_form_opened()
    
    def test_cancel_manual_entry(self, page: Page):
        """Test canceling manual entry form"""
        manual_entry = ManualEntryPage(page)
        
        # Open form and fill some data
        manual_entry.open_form()
        manual_entry.fill_merchant_name("Test")
        manual_entry.fill_date("2026-01-26")
        
        # Cancel form
        manual_entry.cancel_form()
        manual_entry.assert_form_closed()
    
    def test_receipt_statistics(self, page: Page):
        """Test receipt statistics display"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create receipts
        manual_entry.create_receipt("Store 1", "2026-01-26", "50.00")
        manual_entry.create_receipt("Store 2", "2026-01-26", "75.00")
        
        # Check stats are visible
        receipt_list.assert_stats_visible()
        
        # Get stats (implementation-dependent)
        total_count = receipt_list.get_total_receipts_stat()
        total_amount = receipt_list.get_total_amount_stat()
        
        print(f"Total receipts: {total_count}")
        print(f"Total amount: {total_amount}")
    
    @pytest.mark.slow
    @pytest.mark.external
    def test_upload_receipt_file(self, page: Page, sample_receipt_image: str):
        """Test uploading a receipt file (if feature exists)"""
        home = HomePage(page)
        receipt_list = ReceiptListPage(page)

        home.select_ai_model("Gemini 2.5 Flash Lite")
        
        # Upload file
        home.upload_file(sample_receipt_image)
        
        # Scroll to top where new receipts appear
        page.evaluate("window.scrollTo(0, 0)")
        
        # Verify receipt appears (depends on OCR implementation)
        receipt_list.wait_for_receipts_to_load()
        assert receipt_list.has_receipts()

    def test_ai_model_selection_persists(self, page: Page):
        """Test AI model selection stays set"""
        home = HomePage(page)

        home.select_ai_model("Gemini 2.5 Flash Lite")
        selected = home.get_selected_ai_model_value()
        assert selected == "google/gemini-2.5-flash-lite"
    
    def test_fluent_api_chaining(self, page: Page):
        """Demonstrate fluent API with method chaining"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Chain methods for cleaner code
        (manual_entry
            .open_form()
            .fill_merchant_name("Fluent Store")
            .fill_date("2026-01-26")
            .fill_total("200.00")
            .select_currency("USD")
            .submit_form())
        
        # Scroll to top where new receipts appear
        page.evaluate("window.scrollTo(0, 0)")
        
        # Verify with chained assertions
        (receipt_list
            .wait_for_receipts_to_load(timeout=15000)
            .assert_receipt_exists("Fluent Store")
            .assert_receipt_count(1))


class TestAdvancedPageObjectPatterns:
    """Advanced patterns with page objects"""
    
    def test_multiple_receipts_bulk_operations(self, page: Page):
        """Test creating and managing multiple receipts"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create multiple receipts
        test_receipts = [
            ("Amazon", "2026-01-20", "100.00"),
            ("Best Buy", "2026-01-21", "200.00"),
            ("Target", "2026-01-22", "150.00"),
        ]
        
        for merchant, date, total in test_receipts:
            manual_entry.create_receipt(merchant, date, total)
        
        # Scroll to top to see all receipts
        page.evaluate("window.scrollTo(0, 0)")
        
        receipt_list.wait_for_receipts_to_load(timeout=15000)
        
        # Verify all created
        receipt_list.assert_receipt_count(len(test_receipts))
        
        for merchant, _, _ in test_receipts:
            receipt_list.assert_receipt_exists(merchant)
    
    def test_receipt_list_operations(self, page: Page):
        """Test various receipt list operations"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create test data
        manual_entry.create_receipt("Grocery Store", "2026-01-26", "85.50")
        
        # Scroll to top to see receipt
        page.evaluate("window.scrollTo(0, 0)")
        
        receipt_list.wait_for_receipts_to_load()
        
        # Get receipt count
        count = receipt_list.get_receipt_count()
        assert count > 0, f"Expected at least 1 receipt, got {count}"
        
        # Get merchants list
        merchants = receipt_list.get_receipt_merchants()
        assert "Grocery Store" in merchants, f"Expected 'Grocery Store' in {merchants}"
        
        # Check for empty state
        assert not receipt_list.is_empty()
        assert receipt_list.has_receipts()
    
    def test_state_after_delete(self, page: Page):
        """Test application state after deleting receipts"""
        manual_entry = ManualEntryPage(page)
        receipt_list = ReceiptListPage(page)
        
        # Create single receipt
        manual_entry.create_receipt("Only Receipt", "2026-01-26", "50.00")
        
        # Scroll to top to see receipt
        page.evaluate("window.scrollTo(0, 0)")
        
        receipt_list.wait_for_receipts_to_load()
        receipt_list.assert_receipt_exists("Only Receipt")
        receipt_list.assert_receipt_count(1)
        
        # Delete it
        receipt_list.delete_receipt_by_merchant("Only Receipt")
        
        # Should show empty state (if implemented)
        # receipt_list.assert_empty_state_shown()
        receipt_list.assert_receipt_count(0)
    
    def test_error_handling(self, page: Page):
        """Test error handling scenarios"""
        manual_entry = ManualEntryPage(page)
        
        # Open form
        manual_entry.open_form()
        
        # Try invalid data
        manual_entry.fill_merchant_name("")  # Empty merchant
        
        # Browsers reject invalid date formats, so skip this test or use valid date
        # manual_entry.fill_date("invalid-date")  # Would throw "Malformed value" error
        manual_entry.fill_date("2026-01-01")  # Use valid date format
        
        manual_entry.fill_total("-50.00")  # Negative amount (HTML5 won't prevent this)
        
        # Submit
        manual_entry.submit_form()
        
        # Should show validation error
        error_msg = manual_entry.get_validation_error()
        assert len(error_msg) > 0 or manual_entry.is_form_visible()


# Example: Using pytest fixtures with page objects
@pytest.fixture
def home_page(page: Page) -> HomePage:
    """Fixture to provide HomePage instance"""
    return HomePage(page)


@pytest.fixture
def manual_entry_page(page: Page) -> ManualEntryPage:
    """Fixture to provide ManualEntryPage instance"""
    return ManualEntryPage(page)


@pytest.fixture
def receipt_list_page(page: Page) -> ReceiptListPage:
    """Fixture to provide ReceiptListPage instance"""
    return ReceiptListPage(page)


class TestWithPageObjectFixtures:
    """Tests using page object fixtures"""
    
    def test_with_fixtures(
        self,
        home_page: HomePage,
        manual_entry_page: ManualEntryPage,
        receipt_list_page: ReceiptListPage
    ):
        """Test using injected page object fixtures"""
        home_page.navigate_home()
        manual_entry_page.create_receipt("Fixture Store", "2026-01-26", "99.99")
        receipt_list_page.assert_receipt_exists("Fixture Store")
