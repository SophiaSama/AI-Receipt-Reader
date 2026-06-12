"""E2E test for per-user data isolation enforced by Supabase Row Level Security.

User A creates a receipt, signs out; User B signs in and must NOT see it.
"""

from __future__ import annotations

import os
import time

import pytest
from playwright.sync_api import Page, expect

from pages.auth_page import AuthPage
from pages.manual_entry_page import ManualEntryPage
from pages.receipt_list_page import ReceiptListPage

USER_A_EMAIL = os.getenv("E2E_USER_A_EMAIL", "")
USER_A_PASSWORD = os.getenv("E2E_USER_A_PASSWORD", "")
USER_B_EMAIL = os.getenv("E2E_USER_B_EMAIL", "")
USER_B_PASSWORD = os.getenv("E2E_USER_B_PASSWORD", "")

requires_two_users = pytest.mark.skipif(
    not (USER_A_EMAIL and USER_A_PASSWORD and USER_B_EMAIL and USER_B_PASSWORD),
    reason="Both E2E_USER_A_* and E2E_USER_B_* credentials are required",
)


@requires_two_users
def test_receipts_are_isolated_per_user(unauth_page: Page):
    """A receipt created by user A is invisible to user B (RLS)."""
    auth = AuthPage(unauth_page)
    manual = ManualEntryPage(unauth_page)
    receipts = ReceiptListPage(unauth_page)

    unique_merchant = f"IsolationStore-{int(time.time())}"

    # --- User A creates a receipt ---
    auth.login(USER_A_EMAIL, USER_A_PASSWORD)
    manual.create_receipt(
        merchant=unique_merchant,
        date="2026-05-01",
        total="42.00",
        currency="USD",
    )
    expect(receipts.get_receipt_by_merchant(unique_merchant)).to_be_visible(timeout=15000)

    # --- User A signs out ---
    auth.logout()

    # --- User B signs in and must not see user A's receipt ---
    auth.login(USER_B_EMAIL, USER_B_PASSWORD)
    receipts.wait_for_receipts_to_load(timeout=15000)
    expect(unauth_page.locator(f"text={unique_merchant}")).to_have_count(0)
