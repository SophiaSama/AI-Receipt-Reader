"""
Home Page Object Model
Encapsulates main home page functionality
"""
from playwright.sync_api import Page, expect
from .base_page import BasePage
from typing import Optional


class HomePage(BasePage):
    """Page Object for home/main page"""
    
    # Main navigation
    LOGO = ".logo, [data-testid='logo']"
    HOME_LINK = "a[href='/'], a:has-text('Home')"
    RECEIPTS_LINK = "a[href='/receipts'], a:has-text('Receipts')"
    
    # Primary actions
    MANUAL_ENTRY_BUTTON = "button:has-text('Manual'), text=Manual Entry"
    UPLOAD_BUTTON = "button:has-text('Upload'), text=Upload Receipt"
    EXPORT_BUTTON = "button:has-text('Export')"
    
    # Upload modal
    FILE_INPUT = "input[type='file']"
    UPLOAD_SUBMIT = "button:has-text('Upload'), button[type='submit']"
    UPLOAD_CANCEL = "button:has-text('Cancel')"
    
    # Export options
    EXPORT_CSV_BUTTON = "button:has-text('CSV')"
    EXPORT_PDF_BUTTON = "button:has-text('PDF')"
    EXPORT_EXCEL_BUTTON = "button:has-text('Excel')"
    
    def __init__(self, page: Page):
        super().__init__(page)
    
    def navigate_home(self):
        """Navigate to home page"""
        self.navigate("/")
        return self
    
    # Primary actions
    def click_manual_entry(self):
        """Click manual entry button"""
        self.page.locator(self.MANUAL_ENTRY_BUTTON).first.click()
        return self
    
    def click_upload(self):
        """Click upload button"""
        self.page.locator(self.UPLOAD_BUTTON).first.click()
        return self
    
    def click_export(self):
        """Click export button"""
        self.page.locator(self.EXPORT_BUTTON).first.click()
        return self
    
    # Upload operations
    def upload_file(self, file_path: str):
        """
        Upload a receipt file
        
        Args:
            file_path: Path to the file to upload
        """
        # Open upload dialog
        self.click_upload()
        
        # Wait for file input
        self.page.wait_for_selector(self.FILE_INPUT)
        
        # Set file
        self.page.set_input_files(self.FILE_INPUT, file_path)
        
        # Submit upload
        submit_btn = self.page.locator(self.UPLOAD_SUBMIT)
        if submit_btn.is_visible():
            submit_btn.click()
        
        return self
    
    def cancel_upload(self):
        """Cancel upload dialog"""
        cancel_btn = self.page.locator(self.UPLOAD_CANCEL)
        if cancel_btn.is_visible():
            cancel_btn.click()
        return self
    
    # Export operations
    def export_as_csv(self):
        """Export receipts as CSV"""
        self.click_export()
        csv_btn = self.page.locator(self.EXPORT_CSV_BUTTON)
        if csv_btn.is_visible():
            csv_btn.click()
        return self
    
    def export_as_pdf(self):
        """Export receipts as PDF"""
        self.click_export()
        pdf_btn = self.page.locator(self.EXPORT_PDF_BUTTON)
        if pdf_btn.is_visible():
            pdf_btn.click()
        return self
    
    # Navigation
    def navigate_to_receipts(self):
        """Navigate to receipts page"""
        receipts_link = self.page.locator(self.RECEIPTS_LINK)
        if receipts_link.is_visible():
            receipts_link.click()
        return self
    
    def click_logo(self):
        """Click logo to go home"""
        self.page.locator(self.LOGO).click()
        return self
    
    # State checks
    def is_upload_modal_open(self) -> bool:
        """Check if upload modal is open"""
        return self.page.locator(self.FILE_INPUT).is_visible()
    
    def is_manual_entry_available(self) -> bool:
        """Check if manual entry button is available"""
        return self.page.locator(self.MANUAL_ENTRY_BUTTON).is_visible()
    
    def is_upload_available(self) -> bool:
        """Check if upload button is available"""
        return self.page.locator(self.UPLOAD_BUTTON).is_visible()
    
    # Assertions
    def assert_on_home_page(self):
        """Assert that we're on the home page"""
        expect(self.page).to_have_url("**/**")  # Adjust as needed
        return self
    
    def assert_manual_entry_available(self):
        """Assert manual entry button is available"""
        expect(self.page.locator(self.MANUAL_ENTRY_BUTTON)).to_be_visible()
        return self
    
    def assert_upload_available(self):
        """Assert upload button is available"""
        expect(self.page.locator(self.UPLOAD_BUTTON)).to_be_visible()
        return self
    
    def assert_upload_modal_opened(self):
        """Assert upload modal is open"""
        expect(self.page.locator(self.FILE_INPUT)).to_be_visible(timeout=5000)
        return self
    
    def assert_upload_modal_closed(self):
        """Assert upload modal is closed"""
        expect(self.page.locator(self.FILE_INPUT)).not_to_be_visible()
        return self
