"""
Manual Entry Page Object Model
Encapsulates manual receipt entry form functionality
"""
from playwright.sync_api import Page, expect
from .base_page import BasePage
from typing import Optional


class ManualEntryPage(BasePage):
    """Page Object for manual receipt entry form"""

    # Selectors
    MANUAL_ENTRY_BUTTON = "button:has-text('Manual')"
    MERCHANT_INPUT = "input[name='merchantName'], #merchantName"
    DATE_INPUT = "#date, input[name='date']"
    TOTAL_INPUT = "#total, input[name='total']"
    CURRENCY_SELECT = "#currency, select[name='currency']"
    CATEGORY_SELECT = "select[name='category'], #category"
    NOTES_TEXTAREA = "textarea[name='notes'], #notes"
    SUBMIT_BUTTON = "button[type='submit']"
    CANCEL_BUTTON = "button:has-text('Cancel'), button.cancel"
    
    def __init__(self, page: Page):
        super().__init__(page)
    
    def open_form(self):
        """Click to open manual entry form"""
        self.page.locator(self.MANUAL_ENTRY_BUTTON).first.click()
        # Wait for form to appear
        self.page.wait_for_selector(self.MERCHANT_INPUT, timeout=5000)
        return self
    
    def fill_merchant_name(self, merchant: str):
        """Fill merchant name field"""
        self.page.locator(self.MERCHANT_INPUT).fill(merchant)
        return self
    
    def fill_date(self, date: str):
        """Fill date field (format: YYYY-MM-DD)"""
        self.page.locator(self.DATE_INPUT).first.fill(date)
        return self
    
    def fill_total(self, total: str):
        """Fill total amount field"""
        self.page.locator(self.TOTAL_INPUT).first.fill(str(total))
        return self
    
    def select_currency(self, currency: str = "USD"):
        """Select currency (if available)"""
        currency_field = self.page.locator(self.CURRENCY_SELECT).first
        if currency_field.is_visible():
            currency_field.select_option(currency)
        return self
    
    def select_category(self, category: str):
        """Select category (if available)"""
        category_field = self.page.locator(self.CATEGORY_SELECT)
        if category_field.is_visible():
            category_field.select_option(category)
        return self
    
    def fill_notes(self, notes: str):
        """Fill notes/description field (if available)"""
        notes_field = self.page.locator(self.NOTES_TEXTAREA)
        if notes_field.is_visible():
            notes_field.fill(notes)
        return self
    
    def submit_form(self):
        """Click submit button"""
        self.page.locator(self.SUBMIT_BUTTON).or_(
            self.page.locator("button:has-text('Save')").or_(
                self.page.locator("button:has-text('Submit')")
            )
        ).click()
        return self
    
    def cancel_form(self):
        """Click cancel button"""
        cancel_btn = self.page.locator(self.CANCEL_BUTTON)
        if cancel_btn.is_visible():
            cancel_btn.click()
        return self
    
    def is_form_visible(self) -> bool:
        """Check if manual entry form is visible"""
        return self.page.locator(self.MERCHANT_INPUT).is_visible()
    
    def get_validation_error(self) -> str:
        """Get validation error message (if any)"""
        error_locator = self.page.locator(".error, .validation-error, [role='alert']")
        if error_locator.is_visible():
            return error_locator.text_content()
        return ""
    
    # Compound actions
    def create_receipt(
        self,
        merchant: str,
        date: str,
        total: str,
        currency: Optional[str] = "USD",
        category: Optional[str] = None,
        notes: Optional[str] = None,
    ):
        """
        Complete workflow to create a receipt
        
        Args:
            merchant: Merchant name
            date: Date in YYYY-MM-DD format
            total: Total amount as string
            currency: Currency code (default: USD)
            category: Optional category
            notes: Optional notes
        """
        self.open_form()
        self.fill_merchant_name(merchant)
        self.fill_date(date)
        self.fill_total(total)
        
        if currency:
            self.select_currency(currency)
        
        if category:
            self.select_category(category)
        
        if notes:
            self.fill_notes(notes)
        
        self.submit_form()
        return self
    
    # Assertions
    def assert_form_opened(self):
        """Assert that manual entry form is open"""
        expect(self.page.locator(self.MERCHANT_INPUT)).to_be_visible(timeout=5000)
        return self
    
    def assert_form_closed(self):
        """Assert that manual entry form is closed"""
        expect(self.page.locator(self.MERCHANT_INPUT)).not_to_be_visible()
        return self
    
    def assert_validation_error_shown(self):
        """Assert that validation error is shown"""
        error = self.page.locator(".error, .validation-error, [role='alert']")
        expect(error).to_be_visible()
        return self
    
    def assert_required_field_error(self, field_name: str):
        """Assert that specific required field shows error"""
        # This depends on your error implementation
        # Adjust selector as needed
        field_error = self.page.locator(f"[name='{field_name}'] + .error, #{field_name} + .error")
        expect(field_error).to_be_visible()
        return self
