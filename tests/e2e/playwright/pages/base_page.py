"""
Base Page Object Model
Provides common functionality for all page objects
"""
from playwright.sync_api import Page, Locator, expect
from typing import Optional
import os


class BasePage:
    """Base class for all Page Object Models"""
    
    def __init__(self, page: Page):
        self.page = page
        self.base_url = os.getenv("BASE_URL", "http://localhost:3000").rstrip("/")

    def navigate(self, url: str = "/"):
        """Navigate to a URL (relative to base URL)"""
        if url.startswith("http://") or url.startswith("https://"):
            target = url
        else:
            if not url.startswith("/"):
                url = "/" + url
            target = f"{self.base_url}{url}"
        self.page.goto(target)
    
    def get_title(self) -> str:
        """Get page title"""
        return self.page.title()
    
    def wait_for_url(self, url_pattern: str, timeout: int = 5000):
        """Wait for URL to match pattern"""
        self.page.wait_for_url(url_pattern, timeout=timeout)
    
    def take_screenshot(self, path: str, full_page: bool = True):
        """Take a screenshot"""
        self.page.screenshot(path=path, full_page=full_page)
    
    def wait_for_network_idle(self):
        """Wait for network to be idle"""
        self.page.wait_for_load_state("networkidle")
    
    def reload(self):
        """Reload the page"""
        self.page.reload()
    
    # Locator helpers with fallbacks
    def get_button_by_text(self, text: str) -> Locator:
        """Get button by text with multiple selector strategies"""
        return self.page.locator(f"button:has-text('{text}')").or_(
            self.page.locator(f"text={text}")
        )
    
    def get_input_by_name(self, name: str) -> Locator:
        """Get input by name or id"""
        return self.page.locator(f"input[name='{name}']").or_(
            self.page.locator(f"#{name}")
        )
    
    def get_select_by_name(self, name: str) -> Locator:
        """Get select by name or id"""
        return self.page.locator(f"select[name='{name}']").or_(
            self.page.locator(f"#{name}")
        )
    
    # Common actions
    def fill_input(self, selector: str, value: str):
        """Fill input field with fallback selectors"""
        self.page.locator(selector).fill(value)
    
    def click_button(self, text: str):
        """Click button by text"""
        self.get_button_by_text(text).click()
    
    # Assertions
    def assert_text_visible(self, text: str, timeout: int = 5000):
        """Assert text is visible on page"""
        expect(self.page.locator(f"text={text}")).to_be_visible(timeout=timeout)
    
    def assert_text_not_visible(self, text: str):
        """Assert text is not visible on page"""
        expect(self.page.locator(f"text={text}")).not_to_be_visible()
    
    def assert_url_contains(self, url_part: str):
        """Assert URL contains string"""
        expect(self.page).to_have_url(f"**{url_part}**")
