"""
Full workflow E2E tests
"""
import os
import pytest
import time

DELETE_TIMEOUT_MS = int(os.getenv("VITE_DELETE_TIMEOUT_MS", "10000"))
DELETE_ROUTE_DELAY_MS = DELETE_TIMEOUT_MS + 1_000
from playwright.sync_api import Page, expect


class TestFullWorkflow:
    """Test complete user workflows"""

    @pytest.mark.smoke
    def test_create_list_delete_workflow(self, page: Page, sample_receipt_data: dict):
        """Test complete workflow: create → list → delete receipt"""

        # Step 1: Create manual receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")

        unique_merchant = f"{sample_receipt_data['merchantName']} {page.evaluate('Date.now()')}"
        print(f"Using unique merchant name: {unique_merchant}")

        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))

        page.locator("button[type='submit']").click()

        # Step 2: Verify receipt appears in list
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)

        # Step 3: Delete receipt (best-effort depending on UI)
        # Find the receipt row that contains the merchant name
        # Use filter() to match only receipt-item level, not nested child elements
        receipt_row = page.locator("[data-testid='receipt-item']").filter(has_text=unique_merchant).first
        
        # Hover over receipt row to make delete button visible
        receipt_row.hover()
        
        # Wait for delete button to become visible after hover, then click
        delete_button = receipt_row.locator("button[title='Purge Record']")
        delete_button.wait_for(state="visible", timeout=3000)
        delete_button.click()

        # The confirmation modal has a "Delete" button, not "Confirm"
        confirm_button = page.locator("div[role='dialog'] button:has-text('Delete')").or_(
            page.locator("button:has-text('Confirm')").or_(
                page.locator("button:has-text('Yes')")
            )
        )
        if confirm_button.is_visible():
            confirm_button.click()

        expect(page.locator(f"text={unique_merchant}")).not_to_be_visible(timeout=10000)

        # Refresh and verify deleted receipt stays deleted
        page.reload()
        page.wait_for_load_state("networkidle")
        page.wait_for_selector("[data-testid='empty-state'], [data-testid='receipt-item']", timeout=15000)
        expect(page.locator(f"text={unique_merchant}")).not_to_be_visible(timeout=10000)

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

        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)

        search_input = page.locator("input[placeholder*='Search']").or_(
            page.locator("input[type='search']")
        )
        if search_input.is_visible():
            search_input.fill("FilterTest")
            expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=10000)

            search_input.fill("NonExistent12345")
            expect(page.locator(f"text={unique_merchant}")).not_to_be_visible(timeout=10000)

    def test_delete_cancel_keeps_receipt(self, page: Page, sample_receipt_data: dict):
        """Canceling delete should keep the receipt visible"""

        # Create manual receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")

        unique_merchant = f"CancelDelete {page.evaluate('Date.now()')}"
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()

        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)

        # Trigger delete
        receipt_row = page.locator("[data-testid='receipt-item']").filter(has_text=unique_merchant).first
        receipt_row.hover()
        delete_button = receipt_row.locator("button[title='Purge Record']")
        delete_button.wait_for(state="visible", timeout=3000)
        delete_button.click()

        # Cancel delete
        cancel_button = page.locator("div[role='dialog'] button:has-text('Cancel')")
        expect(cancel_button).to_be_visible(timeout=5000)
        cancel_button.click()

        # Receipt should remain
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=10000)

    def test_export_csv_workflow(self, page: Page, sample_receipt_data: dict):
        """Test exporting receipts to CSV"""

        # Create at least one receipt so export has data
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")

        unique_merchant = f"ExportTest {page.evaluate('Date.now()')}"
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()

        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)

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
    def test_delete_timeout_shows_error(self, page: Page, sample_receipt_data: dict):
        """Delete should time out after 10s and show an error message"""

        # Create manual receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")

        unique_merchant = f"TimeoutDelete {page.evaluate('Date.now()')}"
        page.fill("input[name='merchantName'], #merchantName", unique_merchant)
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()

        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=20000)

        # Delay DELETE calls beyond the 10s timeout
        def delay_delete(route):
            if route.request.method.upper() == "DELETE":
                time.sleep(DELETE_ROUTE_DELAY_MS / 1000)
                try:
                    return route.fulfill(status=504, body="")
                except Exception:
                    return None
            return route.continue_()

        page.route("**/api/receipts/**", delay_delete)

        # Trigger delete
        receipt_row = page.locator("[data-testid='receipt-item']").filter(has_text=unique_merchant).first
        receipt_row.hover()
        delete_button = receipt_row.locator("button[title='Purge Record']")
        delete_button.wait_for(state="visible", timeout=3000)
        delete_button.click()

        confirm_button = page.locator("div[role='dialog'] button:has-text('Delete')")
        expect(confirm_button).to_be_visible(timeout=5000)
        confirm_button.click()
        page.wait_for_timeout(100)

        # Expect timeout message and receipt still visible
        upload_section = page.locator("[data-testid='upload-section']")
        upload_section.scroll_into_view_if_needed()
        expect(upload_section.get_by_text("Delete timed out")).to_be_visible(timeout=20000)
        expect(page.locator(f"text={unique_merchant}")).to_be_visible(timeout=10000)

        # Prevent teardown errors if route handlers are still running
        page.unroute_all(behavior="ignoreErrors")

    @pytest.mark.slow
    def test_statistics_update_workflow(self, page: Page, sample_receipt_data: dict):
        """Test that statistics update after adding receipt"""

        # Get initial stats (if visible) - use more specific selector
        stats_section = page.locator(".stats, [data-testid='stats']").or_(
            page.get_by_text("Total Spent")
        )
        initial_stats = stats_section.first.text_content() if stats_section.first.is_visible() else ""

        # Add receipt
        page.locator("button:has-text('Manual')").first.click()
        page.wait_for_selector("input[name='merchantName'], #merchantName")

        page.fill("input[name='merchantName'], #merchantName", f"StatsTest {page.evaluate('Date.now()')}")
        page.fill("input[name='date'], #date, input[type='date']", sample_receipt_data["date"])
        page.fill("input[name='total'], #total", str(sample_receipt_data["total"]))
        page.locator("button[type='submit']").click()

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
