"""
API error handling E2E tests
Tests HTTP status codes and error responses.

Post-Supabase migration the only server-side endpoints are:
  - GET  /api/health   (public)
  - POST /api/process  (requires a Supabase Bearer token)
Receipt CRUD now happens client-side directly against Supabase, so there are no
/api/receipts* endpoints to test here.
"""
import os
from playwright.sync_api import Page


class TestAPIErrors:
    """Test API error responses and HTTP status codes"""

    def test_invalid_endpoint_returns_404(self, api_page: Page, api_url: str):
        """Invalid endpoint returns 404 Not Found"""
        response = api_page.request.get(f"{api_url}/nonexistent")
        assert response.status == 404, f"Expected 404, got {response.status}"

    def test_wrong_http_method_returns_405(self, api_page: Page, api_url: str):
        """Health endpoint only accepts GET, try POST -> 405"""
        response = api_page.request.post(f"{api_url}/health")
        assert response.status == 405, f"Expected 405, got {response.status}"


class TestAPIAuth:
    """Test that protected endpoints require authentication"""

    def test_process_requires_auth(self, api_page: Page, api_url: str, sample_receipt_image: str):
        """POST /api/process without a Bearer token returns 401."""
        response = api_page.request.post(
            f"{api_url}/process",
            multipart={
                "file": {
                    "name": os.path.basename(sample_receipt_image),
                    "mimeType": "image/png",
                    "buffer": open(sample_receipt_image, "rb").read(),
                },
            },
        )

        assert response.status == 401, f"Expected 401, got {response.status}"


class TestAPIHealth:
    """Test API health endpoint"""

    def test_health_endpoint_detailed(self, api_page: Page, api_url: str):
        response = api_page.request.get(f"{api_url}/health")
        assert response.status == 200, f"Health check failed with status {response.status}"

        data = response.json()
        # Local server implements status: ok
        assert data.get("status") in ["ok", "healthy"]
        assert "timestamp" in data
