"""
Receipt List Page Object Model
Encapsulates receipt list and filtering functionality
"""
from playwright.sync_api import Page, Locator, expect
from .base_page import BasePage
from typing import List, Optional


class ReceiptListPage(BasePage):
    """Page Object for receipt list and filters"""
    
    # Selectors
    RECEIPT_ROW = ".receipt-row, [data-testid='receipt-item'], .receipt-item"
    RECEIPT_MERCHANT = ".merchant-name, [data-testid='merchant-name']"
    RECEIPT_DATE = ".receipt-date, [data-testid='receipt-date']"
    RECEIPT_TOTAL = ".receipt-total, [data-testid='receipt-total']"
    DELETE_BUTTON = "button:has-text('Delete'), button[aria-label='Delete']"
    EDIT_BUTTON = "button:has-text('Edit'), button[aria-label='Edit']"
    
    # Search and filters
    SEARCH_INPUT = "input[type='search'], input[placeholder*='Search']"
    FILTER_MERCHANT = "#filter-merchant, select[name='merchant']"
    FILTER_DATE_FROM = "#filter-date-from, input[name='dateFrom']"
    FILTER_DATE_TO = "#filter-date-to, input[name='dateTo']"
    FILTER_CATEGORY = "#filter-category, select[name='category']"
    CLEAR_FILTERS_BUTTON = "button:has-text('Clear'), button:has-text('Reset')"
    
    # Stats
    STATS_SECTION = "[data-testid='stats'], .stats"
    TOTAL_RECEIPTS = ".total-receipts, [data-testid='total-receipts']"
    TOTAL_AMOUNT = ".total-amount, [data-testid='total-amount']"
    
    # Empty state
    EMPTY_MESSAGE = ".empty-state, [data-testid='empty-state']"
    
    def __init__(self, page: Page):
        super().__init__(page)
    
    # Receipt list operations
    def get_receipt_rows(self) -> Locator:
        """Get all receipt rows"""
        return self.page.locator(self.RECEIPT_ROW)
    
    def get_receipt_count(self) -> int:
        """Get number of receipts in list"""
        return self.get_receipt_rows().count()
    
    def get_receipt_by_merchant(self, merchant_name: str) -> Locator:
        """Get receipt row by merchant name"""
        return self.page.locator(f"text={merchant_name}").locator("..")
    
    def get_receipt_merchants(self) -> List[str]:
        """Get list of all merchant names"""
        merchants = []
        receipt_rows = self.get_receipt_rows()
        count = receipt_rows.count()
        
        for i in range(count):
            merchant_elem = receipt_rows.nth(i).locator(self.RECEIPT_MERCHANT)
            if merchant_elem.is_visible():
                merchants.append(merchant_elem.text_content().strip())
        
        return merchants
    
    def delete_receipt_by_merchant(self, merchant_name: str):
        """Delete receipt by merchant name"""
        receipt_row = self.get_receipt_by_merchant(merchant_name)
        delete_btn = receipt_row.locator(self.DELETE_BUTTON)
        
        if delete_btn.is_visible():
            delete_btn.click()
            
            # Handle confirmation modal if it appears
            confirm_btn = self.page.locator("button:has-text('Confirm'), button:has-text('Yes'), button:has-text('OK')")
            if confirm_btn.is_visible(timeout=2000):
                confirm_btn.click()
        
        return self
    
    def edit_receipt_by_merchant(self, merchant_name: str):
        """Click edit button for receipt by merchant name"""
        receipt_row = self.get_receipt_by_merchant(merchant_name)
        edit_btn = receipt_row.locator(self.EDIT_BUTTON)
        
        if edit_btn.is_visible():
            edit_btn.click()
        
        return self
    
    # Search and filter operations
    def search(self, query: str):
        """Perform search"""
        search_input = self.page.locator(self.SEARCH_INPUT)
        if search_input.is_visible():
            search_input.fill(query)
        return self
    
    def clear_search(self):
        """Clear search input"""
        search_input = self.page.locator(self.SEARCH_INPUT)
        if search_input.is_visible():
            search_input.fill("")
        return self
    
    def filter_by_merchant(self, merchant: str):
        """Filter by merchant"""
        filter_select = self.page.locator(self.FILTER_MERCHANT)
        if filter_select.is_visible():
            filter_select.select_option(merchant)
        return self
    
    def filter_by_date_range(self, date_from: Optional[str] = None, date_to: Optional[str] = None):
        """Filter by date range (YYYY-MM-DD format)"""
        if date_from:
            from_input = self.page.locator(self.FILTER_DATE_FROM)
            if from_input.is_visible():
                from_input.fill(date_from)
        
        if date_to:
            to_input = self.page.locator(self.FILTER_DATE_TO)
            if to_input.is_visible():
                to_input.fill(date_to)
        
        return self
    
    def filter_by_category(self, category: str):
        """Filter by category"""
        filter_select = self.page.locator(self.FILTER_CATEGORY)
        if filter_select.is_visible():
            filter_select.select_option(category)
        return self
    
    def clear_filters(self):
        """Clear all filters"""
        clear_btn = self.page.locator(self.CLEAR_FILTERS_BUTTON)
        if clear_btn.is_visible():
            clear_btn.click()
        return self
    
    # Stats operations
    def get_total_receipts_stat(self) -> str:
        """Get total receipts statistic"""
        stat = self.page.locator(self.TOTAL_RECEIPTS)
        if stat.is_visible():
            return stat.text_content().strip()
        return "0"
    
    def get_total_amount_stat(self) -> str:
        """Get total amount statistic"""
        stat = self.page.locator(self.TOTAL_AMOUNT)
        if stat.is_visible():
            return stat.text_content().strip()
        return "$0.00"
    
    def is_stats_visible(self) -> bool:
        """Check if stats section is visible"""
        return self.page.locator(self.STATS_SECTION).is_visible()
    
    # State checks
    def is_empty(self) -> bool:
        """Check if receipt list is empty"""
        return self.page.locator(self.EMPTY_MESSAGE).is_visible()
    
    def has_receipts(self) -> bool:
        """Check if there are any receipts"""
        return self.get_receipt_count() > 0
    
    def wait_for_receipts_to_load(self, timeout: int = 5000):
        """Wait for receipts to load and scroll into view if needed"""
        # Wait for either receipts or empty state
        receipt_or_empty = self.page.locator(self.RECEIPT_ROW).or_(
            self.page.locator(self.EMPTY_MESSAGE)
        ).or_(
            self.page.get_by_text("No receipts")
        )
        
        # Wait for element to be attached to DOM
        receipt_or_empty.first.wait_for(state="attached", timeout=timeout)
        
        # Scroll to receipt list section to ensure visibility
        try:
            # Try to scroll the receipt list container into view
            receipt_container = self.page.locator("main").or_(self.page.locator(".receipt-list"))
            if receipt_container.count() > 0:
                receipt_container.first.scroll_into_view_if_needed()
            
            # Also scroll the first receipt into view
            if self.page.locator(self.RECEIPT_ROW).count() > 0:
                self.page.locator(self.RECEIPT_ROW).first.scroll_into_view_if_needed()
        except:
            pass  # Scroll may fail, that's ok
        
        # Now wait for visibility
        receipt_or_empty.first.wait_for(state="visible", timeout=timeout)
        return self
    
    # Assertions
    def assert_receipt_exists(self, merchant_name: str):
        """Assert receipt with merchant name exists"""
        receipt = self.page.get_by_text(merchant_name).first
        # Scroll into view if needed
        try:
            receipt.scroll_into_view_if_needed(timeout=2000)
        except:
            pass  # May already be visible
        expect(receipt).to_be_visible()
        return self
    
    def assert_receipt_not_exists(self, merchant_name: str):
        """Assert receipt with merchant name does not exist"""
        expect(self.page.get_by_text(merchant_name)).not_to_be_visible()
        return self
    
    def assert_receipt_count(self, expected_count: int):
        """Assert number of receipts"""
        expect(self.get_receipt_rows()).to_have_count(expected_count)
        return self
    
    def assert_empty_state_shown(self):
        """Assert empty state is shown"""
        # Check for empty state element or "No receipts" text
        empty_indicator = self.page.locator(self.EMPTY_MESSAGE).or_(
            self.page.get_by_text("No receipts")
        )
        expect(empty_indicator.first).to_be_visible()
        return self
    
    def assert_stats_visible(self):
        """Assert stats section is visible"""
        # Stats overview shows "Total Spent" and "Expense Overview"
        stats_indicator = self.page.locator(self.STATS_SECTION).or_(
            self.page.get_by_text("Total Spent")
        ).or_(
            self.page.get_by_text("Expense Overview")
        )
        expect(stats_indicator.first).to_be_visible()
        return self
    
    def assert_filtered_results(self, expected_merchant_names: List[str]):
        """Assert that filtered results match expected merchants"""
        actual_merchants = self.get_receipt_merchants()
        assert set(actual_merchants) == set(expected_merchant_names), \
            f"Expected {expected_merchant_names}, got {actual_merchants}"
        return self
