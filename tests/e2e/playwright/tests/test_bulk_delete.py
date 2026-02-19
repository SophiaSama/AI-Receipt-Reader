"""
Bulk receipt deletion E2E tests
"""
import pytest
from playwright.sync_api import Page, expect

class TestBulkDelete:
    """Test bulk deletion of multiple receipts"""

    def _create_manual_receipt(self, page: Page, merchant_name: str, amount: str):
        """Helper to create a manual receipt entry"""
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        page.fill("input[name='merchantName'], #merchantName", merchant_name)
        # Use default date
        page.fill("#total, input[name='total']", amount)
        
        # Click Finalize Record (submit)
        page.locator("button[type='submit']").click()
        
        # Wait for it to appear in the list
        expect(page.locator(f"text={merchant_name}")).to_be_visible(timeout=10000)

    def test_bulk_delete_multiple_receipts(self, page: Page):
        """Test selecting and deleting multiple receipts at once"""
        # Ensure we are starting fresh or know what's there
        # Create unique names to avoid collisions with existing data in local store
        m1 = f"BulkDel1 {page.evaluate('Date.now()')}"
        m2 = f"BulkDel2 {page.evaluate('Date.now()') + 100}"
        
        self._create_manual_receipt(page, m1, "12.50")
        self._create_manual_receipt(page, m2, "25.00")
        
        # Locate checkboxes for specific receipts
        # The cards now have data-receipt-id, but we can also find by matching text in the card
        card1 = page.locator("[data-testid='receipt-item']").filter(has_text=m1)
        card2 = page.locator("[data-testid='receipt-item']").filter(has_text=m2)
        
        # Click checkboxes in the cards
        card1.locator("input[type='checkbox']").click()
        card2.locator("input[type='checkbox']").click()
        
        # Verify "PURGE" button appears
        purge_btn = page.locator("button:has-text('PURGE')")
        expect(purge_btn).to_be_visible()
        expect(page.locator("text=2 Selected")).to_be_visible()
        
        # Click Purge Selection
        purge_btn.click()
        
        # Verify Bulk Purge modal
        expect(page.locator("h3:has-text('Bulk Purge')")).to_be_visible()
        expect(page.locator("text=permanently delete 2 entry records")).to_be_visible()
        
        # Confirm Deletion
        page.locator("button:has-text('Delete All')").click()
        
        # Verify they are gone from the UI
        expect(page.locator(f"text={m1}")).not_to_be_visible(timeout=10000)
        expect(page.locator(f"text={m2}")).not_to_be_visible(timeout=10000)

    def test_select_all_functionality(self, page: Page):
        """Test the 'Select All' toggle in the header"""
        # Clear existing selections if any
        cancel_sel = page.locator("button:has-text('Cancel')")
        if cancel_sel.is_visible():
            cancel_sel.click()
            
        # Add a couple of items if list is empty
        items_count = page.locator("[data-testid='receipt-item']").count()
        if items_count < 2:
            self._create_manual_receipt(page, f"SelAll {page.evaluate('Date.now()')}", "1.00")
            self._create_manual_receipt(page, f"SelAll {page.evaluate('Date.now()') + 50}", "2.00")
        
        new_count = page.locator("[data-testid='receipt-item']").count()
        
        # Find header checkbox (it's the first checkbox on the page)
        header_checkbox = page.locator("input[type='checkbox']").first
        header_checkbox.check()
        
        # All items should be selected
        expect(page.locator("button:has-text('PURGE')")).to_be_visible()
        expect(page.locator(f"text={new_count} Selected")).to_be_visible()
        
        # Uncheck header checkbox
        header_checkbox.uncheck()
        expect(page.locator("button:has-text('PURGE')")).not_to_be_visible()
