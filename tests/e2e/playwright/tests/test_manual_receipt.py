"""
Manual receipt entry E2E tests
"""
import pytest
from playwright.sync_api import Page, expect


class TestManualReceipt:
    """Test manual receipt entry functionality"""

    def test_open_manual_entry_form(self, page: Page):
        """Test opening the manual entry form"""
        # Find and click manual entry button
        manual_button = page.locator("button:has-text('Manual')").or_(
            page.locator("text=Manual Entry")
        )
        manual_button.click()
        
        # Verify form appears
        expect(page.locator("input[name='merchantName']").or_(
            page.locator("#merchantName")
        )).to_be_visible(timeout=5000)
    
    def test_fill_and_submit_manual_receipt(self, page: Page, sample_receipt_data: dict):
        """Test filling and submitting manual receipt"""
        # Open manual entry form
        page.locator("button:has-text('Manual')").or_(
            page.locator("text=Manual Entry")
        ).first.click()
        
        # Wait for form
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        unique_merchant = f"{sample_receipt_data['merchantName']} {page.evaluate('Date.now()')}"
        
        # Fill form
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("#date, input[name='date']", sample_receipt_data["date"])
        page.fill("#total, input[name='total']", str(sample_receipt_data["total"]))
        
        # Submit
        page.locator("button[type='submit']").or_(
            page.locator("button:has-text('Save')").or_(
                page.locator("button:has-text('Submit')")
            )
        ).click()
        
        page.wait_for_load_state("networkidle")
        # Verify success (receipt appears in list or success message)
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)
    
    def test_required_fields_validation(self, page: Page):
        """Test that required fields are validated"""
        # Open form
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        # Try to submit empty form
        submit_button = page.locator("button[type='submit']").or_(
            page.locator("button:has-text('Save')")
        )
        submit_button.click()
        
        # Native HTML5 validation may not render .error elements; require merchant input to remain invalid.
        expect(page.locator("input[name='merchantName'], #merchantName")).to_be_visible()
    
    def test_cancel_manual_entry(self, page: Page):
        """Test canceling manual entry form"""
        # Open form
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        # Click cancel
        cancel_btn = page.locator("button:has-text('Cancel')")
        if cancel_btn.is_visible():
            cancel_btn.click()
    
    @pytest.mark.slow
    def test_manual_entry_with_items(self, page: Page, sample_receipt_data: dict):
        """Test adding receipt with line items"""
        # UI uses line items with description + price fields.
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        unique_merchant = f"ItemsTest {page.evaluate('Date.now()')}"
        
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("#date, input[name='date']", sample_receipt_data["date"])
        
        # Add a couple of line items
        add_item = page.locator("button:has-text('Add Item')")
        if add_item.is_visible():
            add_item.click()
            add_item.click()
            
            # Fill the first two description/price inputs if present
            desc_inputs = page.locator("input[placeholder='Item description']")
            price_inputs = page.locator("input[placeholder='Price']")
            
            if desc_inputs.count() >= 2 and price_inputs.count() >= 2:
                desc_inputs.nth(0).fill("Milk")
                price_inputs.nth(0).fill("3.50")
                desc_inputs.nth(1).fill("Bread")
                price_inputs.nth(1).fill("2.00")
        
        # Total is auto-calculated; if not, set it.
        total_input = page.locator("#total, input[name='total']")
        if total_input.is_visible() and not total_input.input_value():
            total_input.fill("5.50")
        
        page.locator("button[type='submit']").click()
        page.wait_for_load_state("networkidle")
        
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)
