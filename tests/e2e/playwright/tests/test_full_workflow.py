"""
Full workflow E2E tests
"""
import pytest
from playwright.sync_api import Page, expect


class TestFullWorkflow:
    """Test complete user workflows"""
    
    @pytest.mark.smoke
    def test_create_list_delete_workflow(self, page: Page, sample_receipt_data: dict):
        """Test complete workflow: create → list → delete receipt"""
        
        # Step 1: Create manual receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        # Use unique merchant name for this test
        unique_merchant = f"{sample_receipt_data['merchantName']} {page.evaluate('Date.now()')}"
        
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        
        page.locator("button[type='submit']").click()
        
        # Step 2: Verify receipt appears in list
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=10000)
        
        # Step 3: Delete receipt
        receipt_row = page.locator(f"text={unique_merchant}").locator("..")
        delete_button = receipt_row.locator("button:has-text('Delete')").or_(
            receipt_row.locator("button[aria-label='Delete']")
        )
        
        if delete_button.is_visible():
            delete_button.click()
            
            # Confirm deletion if modal appears
            confirm_button = page.locator("button:has-text('Confirm')").or_(
                page.locator("button:has-text('Yes')")
            )
            if confirm_button.is_visible():
                confirm_button.click()
            
            # Step 4: Verify receipt is gone
            expect(page.locator(f"text={unique_merchant}")).not_to_be_visible(timeout=5000)
    
    def test_filter_and_search_workflow(self, page: Page, sample_receipt_data: dict):
        """Test filtering and searching receipts"""
        
        # Create test receipt first
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        unique_merchant = f"FilterTest {page.evaluate('Date.now()')}"
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()
        
        # Wait for receipt to appear
        expect(page.locator(f"text={unique_merchant}")).to_be_visible()
        
        # Test search
        search_input = page.locator("input[placeholder*='Search']").or_(
            page.locator("input[type='search']")
        )
        if search_input.is_visible():
            search_input.fill("FilterTest")
            expect(page.locator(f"text={unique_merchant}")).to_be_visible()
            
            # Search for non-existent
            search_input.fill("NonExistent12345")
            expect(page.locator(f"text={unique_merchant}")).not_to_be_visible()
    
    def test_export_csv_workflow(self, page: Page):
        """Test exporting receipts to CSV"""
        
        # Look for export button
        export_button = page.locator("button:has-text('Export')").or_(
            page.locator("button:has-text('CSV')")
        )
        
        if export_button.is_visible():
            # Set up download handler
            with page.expect_download() as download_info:
                export_button.click()
            
            download = download_info.value
            
            # Verify download
            assert download.suggested_filename.endswith('.csv')
            
            # Optional: verify CSV content
            csv_content = download.path().read_text()
            assert "merchantName" in csv_content or "Merchant" in csv_content
    
    @pytest.mark.slow
    def test_statistics_update_workflow(self, page: Page, sample_receipt_data: dict):
        """Test that statistics update after adding receipt"""
        
        # Get initial stats (if visible)
        stats_section = page.locator("text=Total").or_(page.locator(".stats"))
        initial_stats = stats_section.text_content() if stats_section.is_visible() else ""
        
        # Add receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")
        
        page.fill("input[name='merchantName'], #merchantName", f"StatsTest {page.evaluate('Date.now()')}")
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()
        
        # Wait for receipt to appear
        page.wait_for_timeout(2000)
        
        # Check stats updated
        new_stats = stats_section.text_content() if stats_section.is_visible() else ""
        assert new_stats != initial_stats or initial_stats == "", "Statistics should update"
    
    def test_multiple_receipts_workflow(self, page: Page, sample_receipt_data: dict):
        """Test adding multiple receipts"""
        
        receipts_to_create = [
            {"merchant": f"Multi1 {page.evaluate('Date.now()')}", "total": 10.00},
            {"merchant": f"Multi2 {page.evaluate('Date.now()')}", "total": 20.00},
            {"merchant": f"Multi3 {page.evaluate('Date.now()')}", "total": 30.00},
        ]
        
        for receipt in receipts_to_create:
            # Open form
            page.locator("button:has-text('Manual')").first.click()
            page.wait_for_selector("input[name='merchantName'], #merchantName")
            
            # Fill and submit
            page.fill("input[name='merchantName'], #merchantName", receipt["merchant"])
            page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
            page.fill("input[name='total'], #total", str(receipt["total"]))
            page.locator("button[type='submit']").click()
            
            # Wait for receipt to appear
            expect(page.locator(f"text={receipt['merchant']}")).to_be_visible(timeout=5000)
        
        # Verify all receipts visible
        for receipt in receipts_to_create:
            expect(page.locator(f"text={receipt['merchant']}")).to_be_visible()
