"""
E2E tests for client-side image compression.

Verifies that when a user uploads a large high-resolution photo (e.g., > 3MB, 3600x2700px):
1. The browser automatically downscales and compresses the image locally using Canvas before transmission.
2. The network payload sent to POST /api/process is substantially reduced (< 1.5MB),
   avoiding Vercel's 4.5MB request limit and backend memory exhaustion.
3. The receipt processes and renders cleanly in the UI.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
from playwright.sync_api import BrowserContext, Page, expect
from PIL import Image


def _create_large_photo(filepath: Path, width: int = 3600, height: int = 2700) -> str:
    """Creates a high-resolution JPEG test image with varied colors to prevent zero-compression."""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    
    img = Image.new('RGB', (width, height), color=(240, 240, 240))
    pixels = img.load()
    for y in range(0, height, 15):
        color = (y % 256, (y * 3) % 256, (y * 5) % 256)
        for x in range(width):
            pixels[x, y] = color
            
    # Save with quality=95 so original file is large (> 2.5 - 5 MB)
    img.save(filepath, format='JPEG', quality=95)
    return str(filepath)


@pytest.fixture(scope="function")
def large_camera_photo(tmp_path: Path) -> str:
    """Generates a temporary large camera photo fixture (> 2.5MB)."""
    photo_path = tmp_path / "camera_receipt_large.jpg"
    return _create_large_photo(photo_path, width=3600, height=2700)


def test_client_side_compression_reduces_upload_payload(
    context: BrowserContext,
    base_url: str,
    large_camera_photo: str,
):
    """Verify that a large camera photo is compressed client-side before sending to /api/process."""
    
    original_size = Path(large_camera_photo).stat().st_size
    print(f"Original photo size: {original_size / 1024 / 1024:.2f} MB")
    
    # Inject mock session into localStorage before any page script executes
    mock_session = {
        "access_token": "mock-e2e-jwt-token",
        "token_type": "bearer",
        "expires_in": 3600,
        "refresh_token": "mock-refresh",
        "user": {
            "id": "e2e-mock-user",
            "aud": "authenticated",
            "role": "authenticated",
            "email": "e2e-compression@example.com",
        },
    }
    
    # Initialize page with pre-authenticated state
    page = context.new_page()
    page.add_init_script(f"""
        try {{
            const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token')) || 'sb-127-auth-token';
            localStorage.setItem(key, JSON.stringify({json.dumps(mock_session)}));
            localStorage.setItem('sb-localhost-auth-token', JSON.stringify({json.dumps(mock_session)}));
        }} catch (e) {{}}
    """)
    
    # Mock Supabase Auth REST endpoints
    page.route("**/auth/v1/token*", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps({
            "access_token": "mock-e2e-jwt-token",
            "token_type": "bearer",
            "expires_in": 3600,
            "refresh_token": "mock-refresh",
            "user": mock_session["user"],
        })
    ))
    page.route("**/auth/v1/user*", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps(mock_session["user"])
    ))
    page.route("**/auth/v1/session*", lambda r: r.fulfill(
        status=200, content_type="application/json", body=json.dumps(mock_session)
    ))
    
    # Mock receipts list to return empty array initially
    page.route("**/rest/v1/receipts*", lambda r: r.fulfill(
        status=200, content_type="application/json", body="[]"
    ))
    
    # Track outgoing request payload to /api/process
    intercepted_requests = []
    
    mock_receipt = {
        "id": "e2e-comp-001",
        "merchantName": "Compression Cafe",
        "date": "2026-03-01",
        "total": 12.75,
        "currency": "USD",
        "items": [
            {"description": "Latte", "price": 5.50},
            {"description": "Croissant", "price": 7.25}
        ],
        "imageUrl": "https://example.com/compressed.jpg",
        "createdAt": 1772500000000,
    }
    
    def handle_process(route):
        request = route.request
        payload_bytes = request.post_data_buffer or b""
        intercepted_requests.append({
            "size": len(payload_bytes),
            "headers": request.headers,
        })
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(mock_receipt),
        )
        
    page.route("**/api/process*", handle_process)
    
    # Navigate to app
    page.goto(base_url)
    
    # If the login form is shown, log in with mock credentials
    email_input = page.locator("input#email")
    if email_input.is_visible():
        email_input.fill("e2e-compression@example.com")
        page.locator("input#password").fill("Password123!")
        page.locator("button[type='submit']").click()
    
    # Find file input and upload large camera photo
    file_input = page.locator("input[type='file']#dropzone-file")
    file_input.wait_for(state="attached", timeout=15000)
    file_input.set_input_files(large_camera_photo)
    
    # Verify receipt appears in UI list
    expect(page.locator("text=Compression Cafe").first).to_be_visible(timeout=30000)
    expect(page.locator("text=$12.75").or_(page.locator("text=12.75")).first).to_be_visible(timeout=10000)
    
    # Assert that /api/process was called
    assert len(intercepted_requests) == 1, "Expected exactly 1 call to /api/process"
    
    transmitted_size = intercepted_requests[0]["size"]
    print(f"Transmitted payload size: {transmitted_size / 1024:.1f} KB")
    
    # The transmitted payload (including multipart boundary and model param)
    # must be significantly smaller than the original photo (< 1.5MB and < 50% of original)
    assert transmitted_size < 1.5 * 1024 * 1024, f"Payload {transmitted_size} exceeded 1.5MB"
    assert transmitted_size < original_size * 0.5, (
        f"Transmitted size ({transmitted_size}) was not substantially smaller than original ({original_size})"
    )
    
    page.close()
