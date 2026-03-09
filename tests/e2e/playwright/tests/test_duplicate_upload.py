"""E2E tests for duplicate receipt upload confirmation flow."""

from __future__ import annotations

import json
from playwright.sync_api import Page, expect

from pages.home_page import HomePage
from pages.receipt_list_page import ReceiptListPage


def _fulfill_json(route, status: int, payload: object):
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(payload),
    )


def test_duplicate_upload_ignore_does_not_add_record(page: Page, sample_receipt_image: str):
    """Uploading the same receipt twice should prompt and allow ignoring."""

    # Keep the initial list empty
    page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))

    # Allow DELETEs during test cleanup without hitting a real backend
    def _cleanup_delete_only(route):
        if route.request.method.upper() == "DELETE":
            return _fulfill_json(route, 204, {})
        return route.continue_()

    page.route("**/api/receipts/**", _cleanup_delete_only)

    # Mock /api/process: first call returns a normal saved receipt; second call returns duplicate prompt
    process_calls = {"n": 0}

    receipt_1 = {
        "id": "r-1",
        "merchantName": "E2E Coffee",
        "date": "2026-03-06",
        "total": 4.50,
        "currency": "USD",
        "items": [],
        "imageUrl": "https://example.com/receipts/r-1.png",
        "createdAt": 1770000000000,
    }

    pending_2 = {
        "id": "r-2",
        "merchantName": "E2E Coffee",
        "date": "2026-03-06",
        "total": 4.50,
        "currency": "USD",
        "items": [],
        "imageUrl": "https://example.com/receipts/r-2.png",
        "createdAt": 1770000001000,
        "imageHash": "deadbeef",
        "ocrFingerprint": "e2e coffee|2026-03-06|4.50|USD",
    }

    def process_handler(route):
        process_calls["n"] += 1
        if process_calls["n"] == 1:
            return _fulfill_json(route, 200, receipt_1)

        duplicate_payload = {
            "duplicateDetected": True,
            "matchType": "ocrFingerprint",
            "candidateReceipt": {
                "id": receipt_1["id"],
                "merchantName": receipt_1["merchantName"],
                "date": receipt_1["date"],
                "total": receipt_1["total"],
                "currency": receipt_1["currency"],
            },
            "pendingReceipt": pending_2,
        }
        return _fulfill_json(route, 200, duplicate_payload)

    page.route("**/api/process", process_handler)

    # Mock confirm endpoint; ignore should return ignored
    def confirm_handler(route):
        body = route.request.post_data or "{}"
        data = json.loads(body)
        if data.get("action") == "ignore":
            return _fulfill_json(route, 200, {"ignored": True})
        return _fulfill_json(route, 200, data.get("pendingReceipt"))

    page.route("**/api/receipts/confirm", confirm_handler)

    # Upload twice
    home = HomePage(page)
    receipts = ReceiptListPage(page)

    with page.expect_response("**/api/process") as first_resp:
        home.upload_file(sample_receipt_image)
    assert first_resp.value.ok
    receipts.wait_for_receipts_to_load(timeout=15000)
    expect(receipts.get_receipt_rows()).to_have_count(1)
    # Avoid strict-mode ambiguity if the same merchant text appears in multiple places
    expect(receipts.get_receipt_by_merchant("E2E Coffee")).to_be_visible()

    with page.expect_response("**/api/process") as second_resp:
        home.upload_file(sample_receipt_image)
    assert second_resp.value.ok
    # Ensure the mocked duplicate payload was actually returned
    second_json = second_resp.value.json()
    assert second_json.get("duplicateDetected") is True

    # Duplicate modal should appear
    expect(page.get_by_role("heading", name="Possible duplicate receipt")).to_be_visible(timeout=15000)
    expect(page.get_by_text("Existing receipt", exact=True)).to_be_visible()
    dialog = page.get_by_role("dialog")
    expect(dialog.get_by_text("E2E Coffee")).to_be_visible()
    expect(dialog.get_by_text("2026-03-06")).to_be_visible()

    # User confirms it's a duplicate -> ignore
    page.get_by_role("button", name="Yes (duplicate) — ignore").click()

    # Modal closes and list count stays the same
    expect(page.get_by_text("Possible duplicate receipt")).not_to_be_visible(timeout=15000)
    expect(receipts.get_receipt_rows()).to_have_count(1)


def test_duplicate_upload_no_proceeds_and_adds_new_record(page: Page, sample_receipt_image: str):
    """If the user says it's not a duplicate, the receipt should be added."""

    page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
    def _cleanup_delete_only(route):
        if route.request.method.upper() == "DELETE":
            return _fulfill_json(route, 204, {})
        return route.continue_()

    page.route("**/api/receipts/**", _cleanup_delete_only)

    process_calls = {"n": 0}

    receipt_1 = {
        "id": "r-1",
        "merchantName": "E2E Pizza",
        "date": "2026-03-05",
        "total": 18.00,
        "currency": "USD",
        "items": [],
        "imageUrl": "https://example.com/receipts/r-1.png",
        "createdAt": 1770000000000,
    }

    pending_2 = {
        "id": "r-2",
        "merchantName": "E2E Pizza",
        "date": "2026-03-05",
        "total": 18.00,
        "currency": "USD",
        "items": [],
        "imageUrl": "https://example.com/receipts/r-2.png",
        "createdAt": 1770000001000,
    }

    def process_handler(route):
        process_calls["n"] += 1
        if process_calls["n"] == 1:
            return _fulfill_json(route, 200, receipt_1)

        duplicate_payload = {
            "duplicateDetected": True,
            "matchType": "ocrFingerprint",
            "candidateReceipt": {
                "id": receipt_1["id"],
                "merchantName": receipt_1["merchantName"],
                "date": receipt_1["date"],
                "total": receipt_1["total"],
                "currency": receipt_1["currency"],
            },
            "pendingReceipt": pending_2,
        }
        return _fulfill_json(route, 200, duplicate_payload)

    page.route("**/api/process", process_handler)

    # When user chooses save, return the pending receipt as the saved object
    def confirm_handler(route):
        body = route.request.post_data or "{}"
        data = json.loads(body)
        if data.get("action") == "save":
            return _fulfill_json(route, 200, data.get("pendingReceipt"))
        return _fulfill_json(route, 200, {"ignored": True})

    page.route("**/api/receipts/confirm", confirm_handler)

    home = HomePage(page)
    receipts = ReceiptListPage(page)

    with page.expect_response("**/api/process") as first_resp:
        home.upload_file(sample_receipt_image)
    assert first_resp.value.ok
    receipts.wait_for_receipts_to_load(timeout=15000)
    expect(receipts.get_receipt_rows()).to_have_count(1)

    with page.expect_response("**/api/process") as second_resp:
        home.upload_file(sample_receipt_image)
    assert second_resp.value.ok
    second_json = second_resp.value.json()
    assert second_json.get("duplicateDetected") is True

    expect(page.get_by_role("heading", name="Possible duplicate receipt")).to_be_visible(timeout=15000)
    page.get_by_role("button", name="No — add new expense").click()

    expect(page.get_by_text("Possible duplicate receipt")).not_to_be_visible(timeout=15000)
    expect(receipts.get_receipt_rows()).to_have_count(2)
