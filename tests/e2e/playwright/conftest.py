"""
Pytest configuration and shared fixtures for E2E tests
"""
import os
import pytest
from playwright.sync_api import Page, Browser, BrowserContext
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv()

# Configuration
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")
API_URL = os.getenv("API_URL", f"{BASE_URL}/api")
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
FORWARD_API_TO_BACKEND = os.getenv("FORWARD_API_TO_BACKEND", "false").lower() == "true"
RECORD_VIDEO = os.getenv("RECORD_VIDEO", "false").lower() == "true"


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application"""
    return BASE_URL


@pytest.fixture(scope="session")
def api_url():
    """API URL"""
    return API_URL


@pytest.fixture(scope="function")
def context(browser: Browser):
    """Browser context with custom settings"""
    # Optional: rewrite frontend /api calls directly to the backend origin.
    # This is OFF by default because it can interfere with per-test network mocking
    # (e.g. page.route("**/api/process", ...) for upload tests).
    backend_origin = os.getenv("BACKEND_ORIGIN", "http://localhost:3001")

    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        locale="en-US",
        timezone_id="America/New_York",
        record_video_dir="results/videos" if RECORD_VIDEO else None,
    )

    if FORWARD_API_TO_BACKEND:
        # Route all /api/* requests (from the page) to the backend.
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
def page(context: BrowserContext, base_url: str):
    """Page with navigation to base URL"""
    page = context.new_page()
    page.goto(base_url)
    yield page
    page.close()


@pytest.fixture(scope="function")
def api_page(context: BrowserContext):
    """Page without automatic navigation (for API tests)"""
    page = context.new_page()
    yield page
    page.close()


@pytest.fixture(scope="function")
def mock_receipts(page: Page):
    """Mock receipts API with sample data"""
    def mock_handler(route):
        route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id":"1","merchantName":"Test Store","date":"2026-01-26","total":50.00,"currency":"USD","items":[],"source":"manual"}]'
        )
    
    page.route("**/api/receipts", mock_handler)
    return page


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
    # Fixtures are stored in tests/fixtures/ subdirectory
    fixtures_dir = Path(__file__).parent / "tests" / "fixtures"
    image_path = fixtures_dir / "sample-receipt.png"
    
    if not image_path.exists():
        # Create sample image if it doesn't exist
        fixtures_dir.mkdir(parents=True, exist_ok=True)
        from PIL import Image
        img = Image.new('RGB', (800, 600), color='white')
        img.save(image_path)
    
    return str(image_path)


@pytest.fixture(scope="function", autouse=True)
def cleanup_test_data(page: Page, api_url: str):
    """Cleanup test data after each test"""
    yield

    try:
        response = page.request.get(f"{api_url}/receipts")
        if response.ok:
            receipts = response.json()
            for receipt in receipts:
                # Delete all receipts to ensure clean state
                page.request.delete(f"{api_url}/receipts/{receipt['id']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")


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


# Hooks
def pytest_configure(config):
    """Configure pytest"""
    # Ensure results directory exists
    Path("results").mkdir(exist_ok=True)
    Path("results/videos").mkdir(exist_ok=True)
    Path("results/screenshots").mkdir(exist_ok=True)
    Path("results/traces").mkdir(exist_ok=True)


def pytest_runtest_makereport(item, call):
    """Capture screenshot on test failure"""
    if call.when == "call" and call.excinfo is not None:
        page = item.funcargs.get("page")
        if page:
            screenshot_path = f"results/screenshots/{item.name}.png"
            page.screenshot(path=screenshot_path)
            print(f"\nScreenshot saved: {screenshot_path}")


def pytest_collection_modifyitems(config, items):
    if config.getoption("-m") == "external":
        # If user typed -m external, do not skip
        return
    
    skip_external = pytest.mark.skip(reason="need -m external option to run")
    for item in items:
        if "external" in item.keywords:
            item.add_marker(skip_external)
