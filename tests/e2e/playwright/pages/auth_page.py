"""
Auth Page Object Model

Encapsulates the email/password authentication screen (Supabase auth) and the
in-app sign-out control.
"""
from playwright.sync_api import Page, expect

from .base_page import BasePage


class AuthPage(BasePage):
    """Page Object for the login / signup form and sign-out."""

    # Auth form
    EMAIL_INPUT = "#email"
    PASSWORD_INPUT = "#password"
    SIGN_IN_BUTTON = "button[type='submit']:has-text('Sign In')"
    CREATE_ACCOUNT_BUTTON = "button[type='submit']:has-text('Create Account')"
    SWITCH_TO_SIGNUP = "button:has-text('Sign up')"
    SWITCH_TO_LOGIN = "button:has-text('Sign in')"
    ERROR_ALERT = "[role='alert']"
    CONFIRMATION_NOTICE = "[role='status']"

    # Dashboard markers (shown only when authenticated)
    DASHBOARD_MARKER = "button:has-text('Switch to Manual')"
    UPLOAD_SECTION = "[data-testid='upload-section']"
    SIGN_OUT_BUTTON = "button:has-text('Sign Out')"

    def __init__(self, page: Page):
        super().__init__(page)

    # ---- State helpers ----
    def is_auth_form_visible(self) -> bool:
        return self.page.locator(self.EMAIL_INPUT).is_visible()

    def is_logged_in(self) -> bool:
        return self.page.locator(self.SIGN_OUT_BUTTON).is_visible()

    def wait_for_auth_form(self, timeout: int = 10000):
        expect(self.page.locator(self.EMAIL_INPUT)).to_be_visible(timeout=timeout)
        return self

    def wait_for_dashboard(self, timeout: int = 20000):
        expect(self.page.locator(self.DASHBOARD_MARKER)).to_be_visible(timeout=timeout)
        return self

    # ---- Actions ----
    def fill_credentials(self, email: str, password: str):
        self.page.locator(self.EMAIL_INPUT).fill(email)
        self.page.locator(self.PASSWORD_INPUT).fill(password)
        return self

    def login(self, email: str, password: str, expect_success: bool = True):
        """Fill the login form, submit, and (optionally) wait for the dashboard."""
        self.wait_for_auth_form()
        # Ensure we're in login mode (Sign In submit button present).
        if not self.page.locator(self.SIGN_IN_BUTTON).is_visible():
            switch = self.page.locator(self.SWITCH_TO_LOGIN)
            if switch.is_visible():
                switch.click()
        self.fill_credentials(email, password)
        self.page.locator(self.SIGN_IN_BUTTON).click()
        if expect_success:
            self.wait_for_dashboard()
        return self

    def signup(self, email: str, password: str):
        """Switch to signup mode and submit. Returns without asserting outcome."""
        self.wait_for_auth_form()
        switch = self.page.locator(self.SWITCH_TO_SIGNUP)
        if switch.is_visible():
            switch.click()
        self.fill_credentials(email, password)
        self.page.locator(self.CREATE_ACCOUNT_BUTTON).click()
        return self

    def logout(self):
        """Click the in-app sign-out control and wait for the auth form."""
        self.page.locator(self.SIGN_OUT_BUTTON).click()
        self.wait_for_auth_form()
        return self

    def get_error_text(self) -> str:
        alert = self.page.locator(self.ERROR_ALERT)
        if alert.is_visible():
            return alert.text_content() or ""
        return ""

    # ---- Assertions ----
    def assert_logged_in(self):
        expect(self.page.locator(self.SIGN_OUT_BUTTON)).to_be_visible(timeout=20000)
        return self

    def assert_auth_form_visible(self):
        expect(self.page.locator(self.EMAIL_INPUT)).to_be_visible(timeout=10000)
        return self

    def assert_error_visible(self):
        expect(self.page.locator(self.ERROR_ALERT)).to_be_visible(timeout=10000)
        return self
