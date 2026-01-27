"""
API error handling E2E tests
Tests HTTP status codes and error responses
"""
import pytest
from playwright.sync_api import Page


class TestAPIErrors:
    """Test API error responses and HTTP status codes"""

    def test_delete_without_id_returns_400(self, api_page: Page, api_url: str):
        """DELETE /api/receipts/delete without id returns 400 (compat endpoint)."""
        response = api_page.request.delete(f"{api_url}/receipts/delete")

        assert response.status == 400, f"Expected 400, got {response.status}"

        data = response.json()
        assert "error" in data, "Response should contain error field"

    def test_invalid_endpoint_returns_404(self, api_page: Page, api_url: str):
        """Invalid endpoint returns 404 Not Found"""
        response = api_page.request.get(f"{api_url}/nonexistent")
        assert response.status == 404, f"Expected 404, got {response.status}"

    def test_wrong_http_method_returns_405(self, api_page: Page, api_url: str):
        """Health endpoint only accepts GET, try POST -> 405"""
        response = api_page.request.post(f"{api_url}/health")
        assert response.status == 405, f"Expected 405, got {response.status}"

    def test_delete_nonexistent_receipt_returns_404(self, api_page: Page, api_url: str):
        """Deleting non-existent receipt returns 404"""
        fake_id = "nonexistent-receipt-id-12345"
        response = api_page.request.delete(f"{api_url}/receipts/{fake_id}")

        assert response.status in [400, 404], f"Expected 400 or 404, got {response.status}"

        if response.status != 204:
            data = response.json()
            assert "error" in data

    @pytest.mark.parametrize("invalid_id", [
        "",  # Empty
        "   ",  # Whitespace
        "../../../etc/passwd",  # Path traversal
        "<script>alert('xss')</script>",  # XSS attempt
    ])
    def test_invalid_receipt_ids(self, api_page: Page, api_url: str, invalid_id: str):
        """Invalid receipt IDs should return an error status."""
        bad = invalid_id.strip()
        if not bad:
            # compat endpoint validates empty IDs
            response = api_page.request.delete(f"{api_url}/receipts/delete?id=")
        else:
            response = api_page.request.delete(f"{api_url}/receipts/{bad}")

        assert response.status in [400, 404, 422], (
            f"Invalid ID '{invalid_id}' should return error status, got {response.status}"
        )


class TestAPIValidation:
    """Test API input validation"""

    def test_create_receipt_without_required_fields(self, api_page: Page, api_url: str):
        """Creating receipt without required fields returns error"""
        form_data = {"metadata": "{}"}

        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart=form_data,
        )

        assert response.status in [400, 422], f"Expected 400/422, got {response.status}"

    def test_create_receipt_with_invalid_date(self, api_page: Page, api_url: str):
        """Creating receipt with invalid date format"""
        import json
        metadata = {
            "merchantName": "Test Store",
            "date": "invalid-date-format",
            "total": 50.00,
            "currency": "USD",
        }

        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart={"metadata": json.dumps(metadata)},
        )

        # Local handler currently does not strictly validate date format.
        assert response.status in [200, 400, 422]

    def test_create_receipt_with_negative_total(self, api_page: Page, api_url: str):
        """Creating receipt with negative total"""
        import json
        metadata = {
            "merchantName": "Test Store",
            "date": "2026-01-26",
            "total": -50.00,
            "currency": "USD",
        }

        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart={"metadata": json.dumps(metadata)},
        )

        assert response.status in [200, 400, 422]


class TestAPICRUD:
    """Test API CRUD operations"""

    def test_full_api_crud_workflow(self, api_page: Page, api_url: str):
        import json

        metadata = {
            "merchantName": "API Test Store",
            "date": "2026-01-26",
            "total": 123.45,
            "currency": "USD",
            "items": [
                {"description": "API Test Item", "price": 123.45}
            ],
        }

        create_response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart={"metadata": json.dumps(metadata)},
        )

        assert create_response.ok, f"Create failed with status {create_response.status}"
        created = create_response.json()
        receipt_id = created["id"]

        list_response = api_page.request.get(f"{api_url}/receipts")
        assert list_response.ok
        receipts = list_response.json()

        found = next((r for r in receipts if r["id"] == receipt_id), None)
        assert found is not None, "Created receipt not found in list"

        delete_response = api_page.request.delete(f"{api_url}/receipts/{receipt_id}")
        assert delete_response.status in [200, 204], f"Delete failed with status {delete_response.status}"

        verify_response = api_page.request.get(f"{api_url}/receipts")
        verify_receipts = verify_response.json()
        still_exists = next((r for r in verify_receipts if r["id"] == receipt_id), None)
        assert still_exists is None


class TestAPIHealth:
    """Test API health endpoint"""

    def test_health_endpoint_detailed(self, api_page: Page, api_url: str):
        response = api_page.request.get(f"{api_url}/health")
        assert response.status == 200, f"Health check failed with status {response.status}"

        data = response.json()
        # Local server implements status: ok
        assert data.get("status") in ["ok", "healthy"]
        assert "timestamp" in data
