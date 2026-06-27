"""
Pytest configuration and shared fixtures for E2E tests.

Architecture (post-Supabase migration):
- The app is gated by email/password auth (Supabase). Most UI flows require a
  logged-in user, so the default ``page`` fixture signs in as E2E user A.
- Receipt CRUD happens directly against Supabase (PostgREST + Storage) from the
  browser; only ``/api/process`` (OCR/AI) remains server-side and requires a
  Bearer token.
- Test data cleanup uses the Supabase service-role key to wipe the ``receipts``
  table between tests (the CI Supabase stack is throwaway).
"""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import pytest
from dotenv import load_dotenv
from playwright.sync_api import Browser, BrowserContext, Page

from pages.auth_page import AuthPage

# Load environment variables
load_dotenv()

# ---- Application / browser config ----
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
API_URL = os.getenv("API_URL", f"{BASE_URL}/api")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
FORWARD_API_TO_BACKEND = os.getenv("FORWARD_API_TO_BACKEND", "false").lower() == "true"
RECORD_VIDEO = os.getenv("RECORD_VIDEO", "false").lower() == "true"

# ---- Supabase config (server uses SUPABASE_*, frontend uses VITE_SUPABASE_*) ----
SUPABASE_URL = (
    os.getenv("SUPABASE_URL")
    or os.getenv("VITE_SUPABASE_URL")
    or "http://localhost:54321"
).rstrip("/")
SUPABASE_PUBLISHABLE_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") or ""
)
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ---- Seeded test users ----
E2E_USER_A_EMAIL = os.getenv("E2E_USER_A_EMAIL", "")
E2E_USER_A_PASSWORD = os.getenv("E2E_USER_A_PASSWORD", "")
E2E_USER_B_EMAIL = os.getenv("E2E_USER_B_EMAIL", "")
E2E_USER_B_PASSWORD = os.getenv("E2E_USER_B_PASSWORD", "")


# --------------------------------------------------------------------------- #
# Supabase REST helpers (stdlib only, no extra dependencies)
# --------------------------------------------------------------------------- #
def supabase_sign_in(email: str, password: str):
    """Sign a user in via the Supabase Auth REST API and return the access token."""
    if not (SUPABASE_PUBLISHABLE_KEY and email and password):
        return None

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("access_token")
    except (urllib.error.URLError, ValueError) as exc:  # pragma: no cover - network
        print(f"Supabase sign-in failed for {email}: {exc}")
        return None


def supabase_admin_delete_all_receipts() -> None:
    """Delete every row in public.receipts using the service-role key.

    The CI Supabase stack is disposable, so a full wipe between tests keeps each
    test isolated. No-op when the service-role key is not configured.
    """
    if not SUPABASE_SERVICE_ROLE_KEY:
        return

    # PostgREST refuses an unfiltered DELETE; this predicate matches all rows.
    url = f"{SUPABASE_URL}/rest/v1/receipts?created_at=gte.1970-01-01T00:00:00Z"
    req = urllib.request.Request(
        url,
        method="DELETE",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Prefer": "return=minimal",
        },
    )
    try:
        urllib.request.urlopen(req, timeout=15)
    except urllib.error.URLError as exc:  # pragma: no cover - network
        print(f"Receipt cleanup warning: {exc}")


# --------------------------------------------------------------------------- #
# Session-scoped config fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application"""
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    """API URL"""
    return API_URL


# --------------------------------------------------------------------------- #
# Browser context / pages
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="function")
def context(browser: Browser):
    """Browser context with custom settings"""
    backend_origin = os.getenv("BACKEND_ORIGIN", "http://localhost:3001")

    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        locale="en-US",
        timezone_id="America/New_York",
        record_video_dir="results/videos" if RECORD_VIDEO else None,
    )

    if FORWARD_API_TO_BACKEND:
        def _route_api(route):
            url = route.request.url
            if "/api/" in url or url.endswith("/api"):
                path = url.split("/api", 1)[1]
                target = f"{backend_origin}/api{path}"
                return route.continue_(url=target)
            return route.continue_()

        context.route("**/api/**", _route_api)

    yield context
    context.close()


@pytest.fixture(scope="function")
def unauth_page(context: BrowserContext, base_url: str):
    """Page navigated to the app WITHOUT logging in (auth screen / landing tests)."""
    page = context.new_page()
    page.goto(base_url)
    yield page
    page.close()


@pytest.fixture(scope="function")
def page(context: BrowserContext, base_url: str):
    """Page logged in as E2E user A (default for authenticated UI flows).

    Falls back to an unauthenticated page when user A credentials are not
    configured, so the suite still collects/imports without secrets.
    """
    page = context.new_page()
    page.goto(base_url)

    if E2E_USER_A_EMAIL and E2E_USER_A_PASSWORD:
        # Log in AND wait for the app's initial receipts fetch to complete.
        # App.tsx loads receipts in a `[session]` effect triggered by login; if
        # that GET resolves *after* a test's first optimistic insert it would
        # overwrite the UI with the DB's (possibly empty) list and silently drop
        # the just-added row. Waiting for the GET here removes that race for all
        # authenticated tests.
        with page.expect_response(
            lambda r: "/rest/v1/receipts" in r.url and r.request.method == "GET",
            timeout=20000,
        ):
            AuthPage(page).login(E2E_USER_A_EMAIL, E2E_USER_A_PASSWORD)

    yield page
    page.close()


@pytest.fixture(scope="function")
def api_page(context: BrowserContext):
    """Page without automatic navigation (for direct API request tests)."""
    page = context.new_page()
    yield page
    page.close()


# --------------------------------------------------------------------------- #
# Auth / data fixtures
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="function")
def access_token():
    """Access token for E2E user A (used to authorize /api/process requests)."""
    return supabase_sign_in(E2E_USER_A_EMAIL, E2E_USER_A_PASSWORD)


@pytest.fixture(scope="function")
def sample_receipt_data():
    """Sample receipt data for testing"""
    return {
        "merchantName": "Test Store",
        "date": "2026-01-26",
        "total": 50.00,
        "currency": "USD",
        "items": [
            {"name": "Test Item", "quantity": 1, "price": 50.00}
        ]
    }


@pytest.fixture(scope="function")
def sample_receipt_image():
    """Path to sample receipt image"""
    fixtures_dir = Path(__file__).parent / "tests" / "fixtures"
    image_path = fixtures_dir / "sample-receipt.png"

    if not image_path.exists():
        fixtures_dir.mkdir(parents=True, exist_ok=True)
        from PIL import Image
        img = Image.new('RGB', (800, 600), color='white')
        img.save(image_path)

    return str(image_path)


@pytest.fixture(scope="function", autouse=True)
def cleanup_test_data():
    """Remove all receipts after each test via the Supabase service-role key."""
    yield
    supabase_admin_delete_all_receipts()


@pytest.fixture(scope="function")
def disable_animations(page: Page):
    """Disable CSS animations for faster tests"""
    page.add_style_tag(content="""
        *, *::before, *::after {
            animation-duration: 0s !important;
            animation-delay: 0s !important;
            transition-duration: 0s !important;
            transition-delay: 0s !important;
        }
    """)
    return page


# --------------------------------------------------------------------------- #
# Hooks
# --------------------------------------------------------------------------- #
def pytest_configure(config):
    """Configure pytest"""
    Path("results").mkdir(exist_ok=True)
    Path("results/videos").mkdir(exist_ok=True)
    Path("results/screenshots").mkdir(exist_ok=True)
    Path("results/traces").mkdir(exist_ok=True)


def pytest_runtest_makereport(item, call):
    """Capture screenshot on test failure"""
    if call.when == "call" and call.excinfo is not None:
        page = item.funcargs.get("page") or item.funcargs.get("unauth_page")
        if page:
            screenshot_path = f"results/screenshots/{item.name}.png"
            try:
                page.screenshot(path=screenshot_path)
                print(f"\nScreenshot saved: {screenshot_path}")
            except Exception:
                pass


def pytest_collection_modifyitems(config, items):
    if config.getoption("-m") == "external":
        # If user typed -m external, do not skip
        return

    skip_external = pytest.mark.skip(reason="need -m external option to run")
    for item in items:
        if "external" in item.keywords:
            item.add_marker(skip_external)
