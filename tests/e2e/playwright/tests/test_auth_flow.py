"""E2E tests for the email/password authentication flow (Supabase auth)."""

from __future__ import annotations

import os
import time

import pytest
from playwright.sync_api import Page, expect

from pages.auth_page import AuthPage

USER_A_EMAIL = os.getenv("E2E_USER_A_EMAIL", "")
USER_A_PASSWORD = os.getenv("E2E_USER_A_PASSWORD", "")

requires_user_a = pytest.mark.skipif(
    not (USER_A_EMAIL and USER_A_PASSWORD),
    reason="E2E_USER_A_EMAIL / E2E_USER_A_PASSWORD not configured",
)


@requires_user_a
def test_login_success(unauth_page: Page):
    """A seeded user can sign in and reach the dashboard."""
    auth = AuthPage(unauth_page)
    auth.login(USER_A_EMAIL, USER_A_PASSWORD)
    auth.assert_logged_in()


@requires_user_a
def test_login_invalid_credentials(unauth_page: Page):
    """Invalid credentials surface an error and keep the user on the auth form."""
    auth = AuthPage(unauth_page)
    auth.wait_for_auth_form()
    auth.fill_credentials(USER_A_EMAIL, "definitely-the-wrong-password")
    unauth_page.locator(auth.SIGN_IN_BUTTON).click()

    auth.assert_error_visible()
    # Still on the auth form (not logged in).
    expect(unauth_page.locator(auth.EMAIL_INPUT)).to_be_visible()


@requires_user_a
def test_logout(unauth_page: Page):
    """After logging in, the user can sign out and return to the auth form."""
    auth = AuthPage(unauth_page)
    auth.login(USER_A_EMAIL, USER_A_PASSWORD)
    auth.assert_logged_in()

    auth.logout()
    auth.assert_auth_form_visible()


@requires_user_a
def test_signup(unauth_page: Page):
    """A fresh email can register; either lands on the dashboard or a confirmation notice."""
    auth = AuthPage(unauth_page)
    unique_email = f"e2e-signup-{int(time.time())}@example.com"
    auth.signup(unique_email, "TestPassword123!")

    # Depending on the email-confirmation setting, the user is either signed in
    # immediately (dashboard) or shown a "check your email" status notice.
    dashboard = unauth_page.locator(auth.DASHBOARD_MARKER)
    notice = unauth_page.locator(auth.CONFIRMATION_NOTICE)
    expect(dashboard.or_(notice)).to_be_visible(timeout=20000)
