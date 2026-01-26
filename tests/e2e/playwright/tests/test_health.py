"""
Health check E2E tests
"""
import pytest
from playwright.sync_api import Page, expect


class TestHealthCheck:
    """Test application health and basic functionality"""
    
    def test_app_loads(self, page: Page):
        """Test that the application loads successfully"""
        # Check page loaded
        expect(page).to_have_url("http://localhost:3000")
        
        # Check no console errors (optional)
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        
        # Wait for page to be fully loaded
        page.wait_for_load_state("networkidle")
        
        assert len(errors) == 0, f"Console errors found: {errors}"
    
    def test_main_sections_visible(self, page: Page):
        """Test that main sections of the app are visible"""
        # Check upload section
        expect(page.locator("text=Upload Receipt").or_(page.locator("text=Add Receipt"))).to_be_visible()
        
        # Check manual entry section
        expect(page.locator("text=Manual Entry").or_(page.locator("button:has-text('Manual')"))).to_be_visible()
        
        # Check receipts list section
        expect(page.locator("text=Receipt").first).to_be_visible()
    
    @pytest.mark.smoke
    def test_api_health_endpoint(self, api_page: Page, api_url: str):
        """Test that the health API endpoint is working"""
        response = api_page.request.get(f"{api_url}/health")
        
        assert response.ok, f"Health check failed with status {response.status}"
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["service"] == "SmartReceipt API"
    
    def test_no_javascript_errors(self, page: Page):
        """Test that there are no JavaScript errors on page load"""
        errors = []
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        
        page.reload()
        page.wait_for_load_state("networkidle")
        
        assert len(errors) == 0, f"JavaScript errors found: {errors}"
    
    def test_responsive_design(self, context, base_url: str):
        """Test that the app works on mobile viewport"""
        # Create mobile viewport
        mobile_page = context.new_page()
        mobile_page.set_viewport_size({"width": 375, "height": 667})  # iPhone SE
        mobile_page.goto(base_url)
        
        # Check main elements still visible
        expect(mobile_page.locator("body")).to_be_visible()
        
        mobile_page.close()
