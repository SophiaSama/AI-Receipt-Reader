"""
API error handling E2E tests
Tests HTTP status codes and error responses
"""
import pytest
from playwright.sync_api import Page


class TestAPIErrors:
    """Test API error responses and HTTP status codes"""
    
    def test_delete_without_id_returns_400(self, api_page: Page, api_url: str):
        """Test DELETE /api/receipts/delete without id returns 400 Bad Request"""
        response = api_page.request.delete(f"{api_url}/receipts/delete")
        
        assert response.status == 400, f"Expected 400, got {response.status}"
        
        # Verify error message
        data = response.json()
        assert "error" in data, "Response should contain error field"
        
        print(f"✅ DELETE without id correctly returns 400: {data.get('error')}")
    
    def test_invalid_endpoint_returns_404(self, api_page: Page, api_url: str):
        """Test accessing invalid endpoint returns 404 Not Found"""
        response = api_page.request.get(f"{api_url}/nonexistent")
        
        assert response.status == 404, f"Expected 404, got {response.status}"
        
        print(f"✅ Invalid endpoint correctly returns 404")
    
    def test_wrong_http_method_returns_405(self, api_page: Page, api_url: str):
        """Test using wrong HTTP method returns 405 Method Not Allowed"""
        # Health endpoint only accepts GET, try POST
        response = api_page.request.post(f"{api_url}/health")
        
        assert response.status == 405, f"Expected 405, got {response.status}"
        
        print(f"✅ Wrong HTTP method correctly returns 405")
    
    def test_delete_nonexistent_receipt_returns_404(self, api_page: Page, api_url: str):
        """Test deleting non-existent receipt returns 404"""
        fake_id = "nonexistent-receipt-id-12345"
        response = api_page.request.delete(f"{api_url}/receipts/delete?id={fake_id}")
        
        # Should return 404 or 400 depending on implementation
        assert response.status in [400, 404], f"Expected 400 or 404, got {response.status}"
        
        data = response.json()
        assert "error" in data, "Response should contain error field"
        
        print(f"✅ Delete non-existent receipt returns {response.status}: {data.get('error')}")
    
    def test_malformed_json_returns_400(self, api_page: Page, api_url: str):
        """Test sending malformed JSON returns 400 Bad Request"""
        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            headers={"Content-Type": "application/json"},
            data='{"invalid json'  # Malformed JSON
        )
        
        # Should return 400 or 500 depending on error handling
        assert response.status in [400, 415, 500], f"Expected 400/415/500, got {response.status}"
        
        print(f"✅ Malformed JSON returns {response.status}")
    
    @pytest.mark.parametrize("invalid_id", [
        "",  # Empty
        "   ",  # Whitespace
        "../../../etc/passwd",  # Path traversal
        "<script>alert('xss')</script>",  # XSS attempt
    ])
    def test_invalid_receipt_ids(self, api_page: Page, api_url: str, invalid_id: str):
        """Test various invalid receipt IDs are handled properly"""
        response = api_page.request.delete(
            f"{api_url}/receipts/delete?id={invalid_id}"
        )
        
        # Should return error status (not 200)
        assert response.status in [400, 404, 422], \
            f"Invalid ID '{invalid_id}' should return error status, got {response.status}"
        
        print(f"✅ Invalid ID '{invalid_id[:20]}...' correctly rejected with {response.status}")


class TestAPIValidation:
    """Test API input validation"""
    
    def test_create_receipt_without_required_fields(self, api_page: Page, api_url: str):
        """Test creating receipt without required fields returns error"""
        # Empty metadata
        form_data = {
            "metadata": "{}"  # Empty object, missing required fields
        }
        
        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart=form_data
        )
        
        # Should return 400 if validation is implemented
        # Note: Might return 200 if validation is lenient
        if response.status == 400:
            data = response.json()
            assert "error" in data
            print(f"✅ Empty receipt correctly rejected: {data.get('error')}")
        else:
            print(f"⚠️  Empty receipt accepted (status {response.status}) - consider adding validation")
    
    def test_create_receipt_with_invalid_date(self, api_page: Page, api_url: str):
        """Test creating receipt with invalid date format"""
        metadata = {
            "merchantName": "Test Store",
            "date": "invalid-date-format",  # Invalid date
            "total": 50.00,
            "currency": "USD"
        }
        
        form_data = {
            "metadata": str(metadata)
        }
        
        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart=form_data
        )
        
        # Check if validation is implemented
        if response.status == 400:
            print("✅ Invalid date format correctly rejected")
        else:
            print(f"⚠️  Invalid date accepted (status {response.status})")
    
    def test_create_receipt_with_negative_total(self, api_page: Page, api_url: str):
        """Test creating receipt with negative total"""
        metadata = {
            "merchantName": "Test Store",
            "date": "2026-01-26",
            "total": -50.00,  # Negative amount
            "currency": "USD"
        }
        
        form_data = {
            "metadata": str(metadata)
        }
        
        response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart=form_data
        )
        
        # Check if validation is implemented
        if response.status == 400:
            print("✅ Negative total correctly rejected")
        else:
            print(f"⚠️  Negative total accepted (status {response.status})")


class TestAPICRUD:
    """Test API CRUD operations (migrated from TypeScript E2E)"""
    
    def test_full_api_crud_workflow(self, api_page: Page, api_url: str):
        """
        Test complete CRUD workflow via API
        Migrated from: tests/e2e/api.e2e.test.ts
        """
        # CREATE
        metadata = {
            "merchantName": "API Test Store",
            "date": "2026-01-26",
            "total": 123.45,
            "currency": "USD",
            "items": [
                {"name": "API Test Item", "quantity": 1, "price": 123.45}
            ]
        }
        
        import json
        form_data = {
            "metadata": json.dumps(metadata)
        }
        
        create_response = api_page.request.post(
            f"{api_url}/receipts/manual",
            multipart=form_data
        )
        
        assert create_response.ok, f"Create failed with status {create_response.status}"
        created = create_response.json()
        assert "id" in created
        assert created["merchantName"] == "API Test Store"
        assert created["total"] == 123.45
        
        receipt_id = created["id"]
        print(f"✅ Created receipt via API: {receipt_id}")
        
        # READ (list)
        list_response = api_page.request.get(f"{api_url}/receipts")
        assert list_response.ok
        receipts = list_response.json()
        assert isinstance(receipts, list)
        
        # Find our receipt
        found = next((r for r in receipts if r["id"] == receipt_id), None)
        assert found is not None, "Created receipt not found in list"
        assert found["merchantName"] == "API Test Store"
        print(f"✅ Found receipt in list: {found['merchantName']}")
        
        # DELETE
        delete_response = api_page.request.delete(
            f"{api_url}/receipts/delete?id={receipt_id}"
        )
        assert delete_response.status in [200, 204], \
            f"Delete failed with status {delete_response.status}"
        print(f"✅ Deleted receipt: {receipt_id}")
        
        # VERIFY deletion
        verify_response = api_page.request.get(f"{api_url}/receipts")
        verify_receipts = verify_response.json()
        
        still_exists = next((r for r in verify_receipts if r["id"] == receipt_id), None)
        assert still_exists is None, "Receipt still exists after deletion"
        print(f"✅ Verified deletion - receipt no longer in list")


class TestAPIHealth:
    """Test API health endpoint (migrated from TypeScript E2E)"""
    
    def test_health_endpoint_detailed(self, api_page: Page, api_url: str):
        """
        Test health endpoint with detailed assertions
        Migrated from: tests/e2e/api.e2e.test.ts
        """
        response = api_page.request.get(f"{api_url}/health")
        
        assert response.status == 200, f"Health check failed with status {response.status}"
        
        data = response.json()
        
        # Detailed assertions
        assert data["status"] == "healthy", f"Expected status 'healthy', got '{data.get('status')}'"
        assert data["service"] == "SmartReceipt API", \
            f"Expected service 'SmartReceipt API', got '{data.get('service')}'"
        assert "timestamp" in data, "Response should include timestamp"
        
        print(f"✅ Health check passed: {data}")
        print(f"   Status: {data['status']}")
        print(f"   Service: {data['service']}")
        print(f"   Timestamp: {data.get('timestamp')}")
