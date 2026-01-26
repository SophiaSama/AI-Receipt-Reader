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
        
        # Fill form
        page.fill("input[name='merchantName'], #merchantName", sample_receipt_data["merchantName"])
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        
        # Optional: currency
        currency_field = page.locator("select[name='currency'], #currency")
        if currency_field.is_visible():
            currency_field.select_option(sample_receipt_data["currency"])
        
        # Submit
        page.locator("button[type='submit']").or_(
            page.locator("button:has-text('Save')").or_(
                page.locator("button:has-text('Submit')")
            )
        ).click()
        
        # Verify success (receipt appears in list or success message)
        expect(page.locator(f"text={sample_receipt_data['merchantName']}")).to_be_visible(timeout=10000)
    
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
        
        # Should show validation errors or prevent submission
        # (Exact behavior depends on your implementation)
        # Check form is still visible (not submitted)
        expect(page.locator("input[name='merchantName'], #merchantName")).to_be_visible()
    
    def test_cancel_manual_entry(self, page: Page):
        """Test canceling manual entry form"""
        # Open form
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        # Fill some data
        page.fill("input[name='merchantName'], #merchantName", "Test")
        
        # Click cancel
        cancel_button = page.locator("button:has-text('Cancel')").or_(
            page.locator("button.cancel")
        )
        if cancel_button.is_visible():
            cancel_button.click()
            
            # Form should close
            expect(page.locator("input[name='merchantName']")).not_to_be_visible()
    
    @pytest.mark.slow
    def test_manual_entry_with_items(self, page: Page, sample_receipt_data: dict):
        """Test adding receipt with line items"""
        # Open form
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        # Fill basic info
        page.fill("input[name='merchantName'], #merchantName", sample_receipt_data["merchantName"])
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        
        # Add items (if supported)
        add_item_button = page.locator("button:has-text('Add Item')")
        if add_item_button.is_visible():
            add_item_button.click()
            
            # Fill item details
            for i, item in enumerate(sample_receipt_data["items"]):
                page.fill(f"input[name='items[{i}].name']", item["name"])
                page.fill(f"input[name='items[{i}].quantity']", str(item["quantity"]))
                page.fill(f"input[name='items[{i}].price']", str(item["price"]))
        
        # Submit
        page.locator("button[type='submit']").click()
        
        # Verify
        expect(page.locator(f"text={sample_receipt_data['merchantName']}")).to_be_visible(timeout=10000)
