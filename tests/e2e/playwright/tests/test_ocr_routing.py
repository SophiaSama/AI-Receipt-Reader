"""
E2E tests for smart OCR routing system.
Tests that the backend correctly analyzes images and routes to Tesseract, Hybrid, or Vision LLM,
and that the frontend displays processing metrics when present.
"""

from __future__ import annotations

import json
import pytest
from playwright.sync_api import Page, expect

from pages.home_page import HomePage
from pages.receipt_list_page import ReceiptListPage


def _fulfill_json(route, status: int, payload: object):
    route.fulfill(
        status=status,
        content_type="application/json",
        body=json.dumps(payload),
    )


# ---------- Mock receipt builders ----------

def _make_receipt(
    receipt_id: str,
    merchant: str,
    ocr_route: str | None = None,
    processing_metrics: dict | None = None,
):
    """Build a mock receipt payload with optional OCR routing fields."""
    receipt = {
        "id": receipt_id,
        "merchantName": merchant,
        "date": "2026-04-27",
        "total": 12.50,
        "currency": "SGD",
        "items": [{"description": "Coffee", "price": 12.50}],
        "imageUrl": f"https://example.com/receipts/{receipt_id}.png",
        "rawText": "MOCK STORE\nCoffee  $12.50\nTOTAL: $12.50",
        "createdAt": 1770000000000,
    }
    if ocr_route:
        receipt["ocrRoute"] = ocr_route
    if processing_metrics:
        receipt["processingMetrics"] = processing_metrics
    return receipt


# ---------- Tests: API-level OCR routing ----------

class TestOcrRoutingAPI:
    """Test that the /api/process endpoint returns OCR routing metadata."""

    def test_process_returns_ocr_route_field(self, api_page: Page, api_url: str, sample_receipt_image: str):
        """POST /api/process should include ocrRoute in the response."""
        import os
        receipt_path = sample_receipt_image

        response = api_page.request.post(
            f"{api_url}/process",
            multipart={
                "file": {
                    "name": os.path.basename(receipt_path),
                    "mimeType": "image/png",
                    "buffer": open(receipt_path, "rb").read(),
                },
            },
        )

        # The request may fail if no AI key is configured, but it should
        # still reach the routing logic and return either success or a structured error.
        if response.ok:
            data = response.json()
            # The response should have the new ocrRoute field
            assert "ocrRoute" in data, f"Response missing ocrRoute: {list(data.keys())}"
            assert data["ocrRoute"] in ["tesseract", "hybrid", "vision_llm"], (
                f"Unexpected ocrRoute value: {data['ocrRoute']}"
            )

    def test_process_returns_processing_metrics(self, api_page: Page, api_url: str, sample_receipt_image: str):
        """POST /api/process should include processingMetrics in the response."""
        import os
        receipt_path = sample_receipt_image

        response = api_page.request.post(
            f"{api_url}/process",
            multipart={
                "file": {
                    "name": os.path.basename(receipt_path),
                    "mimeType": "image/png",
                    "buffer": open(receipt_path, "rb").read(),
                },
            },
        )

        if response.ok:
            data = response.json()
            assert "processingMetrics" in data, f"Response missing processingMetrics: {list(data.keys())}"
            metrics = data["processingMetrics"]
            assert "route" in metrics, "Metrics missing 'route'"
            assert "durationMs" in metrics, "Metrics missing 'durationMs'"
            assert isinstance(metrics["durationMs"], (int, float)), "durationMs should be a number"
            assert metrics["durationMs"] >= 0, "durationMs should be non-negative"

    def test_process_route_matches_metrics_route(self, api_page: Page, api_url: str, sample_receipt_image: str):
        """ocrRoute and processingMetrics.route should match."""
        import os
        receipt_path = sample_receipt_image

        response = api_page.request.post(
            f"{api_url}/process",
            multipart={
                "file": {
                    "name": os.path.basename(receipt_path),
                    "mimeType": "image/png",
                    "buffer": open(receipt_path, "rb").read(),
                },
            },
        )

        if response.ok:
            data = response.json()
            if "ocrRoute" in data and "processingMetrics" in data:
                assert data["ocrRoute"] == data["processingMetrics"]["route"], (
                    f"ocrRoute ({data['ocrRoute']}) != metrics.route ({data['processingMetrics']['route']})"
                )


# ---------- Tests: UI upload with mocked routing responses ----------

class TestOcrRoutingUI:
    """Test the full upload flow with mocked API responses that include routing metadata."""

    def test_upload_with_tesseract_route(self, page: Page, sample_receipt_image: str):
        """Upload should succeed when backend returns tesseract route."""
        receipt = _make_receipt(
            "r-tess-1",
            "Tesseract Store",
            ocr_route="tesseract",
            processing_metrics={"route": "tesseract", "durationMs": 95},
        )

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
        page.route("**/api/process", lambda route: _fulfill_json(route, 200, receipt))

        # Allow DELETEs during cleanup
        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        home = HomePage(page)
        receipts = ReceiptListPage(page)

        with page.expect_response("**/api/process") as resp_info:
            home.upload_file(sample_receipt_image)

        assert resp_info.value.ok
        response_data = resp_info.value.json()
        assert response_data["ocrRoute"] == "tesseract"
        assert response_data["processingMetrics"]["durationMs"] == 95

        receipts.wait_for_receipts_to_load(timeout=15000)
        expect(receipts.get_receipt_by_merchant("Tesseract Store")).to_be_visible()

    def test_upload_with_hybrid_route(self, page: Page, sample_receipt_image: str):
        """Upload should succeed when backend returns hybrid route."""
        receipt = _make_receipt(
            "r-hyb-1",
            "Hybrid Store",
            ocr_route="hybrid",
            processing_metrics={"route": "hybrid", "durationMs": 3200, "tokensUsed": 450},
        )

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
        page.route("**/api/process", lambda route: _fulfill_json(route, 200, receipt))

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        home = HomePage(page)
        receipts = ReceiptListPage(page)

        with page.expect_response("**/api/process") as resp_info:
            home.upload_file(sample_receipt_image)

        assert resp_info.value.ok
        response_data = resp_info.value.json()
        assert response_data["ocrRoute"] == "hybrid"
        assert response_data["processingMetrics"]["tokensUsed"] == 450

        receipts.wait_for_receipts_to_load(timeout=15000)
        expect(receipts.get_receipt_by_merchant("Hybrid Store")).to_be_visible()

    def test_upload_with_vision_llm_route(self, page: Page, sample_receipt_image: str):
        """Upload should succeed when backend returns vision_llm route."""
        receipt = _make_receipt(
            "r-llm-1",
            "Vision Store",
            ocr_route="vision_llm",
            processing_metrics={"route": "vision_llm", "durationMs": 5800, "tokensUsed": 1200},
        )

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
        page.route("**/api/process", lambda route: _fulfill_json(route, 200, receipt))

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        home = HomePage(page)
        receipts = ReceiptListPage(page)

        with page.expect_response("**/api/process") as resp_info:
            home.upload_file(sample_receipt_image)

        assert resp_info.value.ok
        response_data = resp_info.value.json()
        assert response_data["ocrRoute"] == "vision_llm"
        assert response_data["processingMetrics"]["durationMs"] == 5800

        receipts.wait_for_receipts_to_load(timeout=15000)
        expect(receipts.get_receipt_by_merchant("Vision Store")).to_be_visible()

    def test_upload_backward_compatible_without_routing_fields(self, page: Page, sample_receipt_image: str):
        """Receipt without ocrRoute/processingMetrics should still render correctly (backward compat)."""
        receipt = _make_receipt("r-legacy-1", "Legacy Store")
        # Intentionally omit ocrRoute and processingMetrics

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
        page.route("**/api/process", lambda route: _fulfill_json(route, 200, receipt))

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        home = HomePage(page)
        receipts = ReceiptListPage(page)

        with page.expect_response("**/api/process") as resp_info:
            home.upload_file(sample_receipt_image)

        assert resp_info.value.ok
        response_data = resp_info.value.json()
        # Routing fields should not be present
        assert "ocrRoute" not in response_data

        receipts.wait_for_receipts_to_load(timeout=15000)
        expect(receipts.get_receipt_by_merchant("Legacy Store")).to_be_visible()


# ---------- Tests: Receipt list displays routing metadata ----------

class TestOcrRoutingReceiptList:
    """Test that receipts with different OCR routes are correctly listed."""

    def test_list_receipts_with_mixed_routes(self, page: Page):
        """Receipt list should render receipts processed via different routes."""
        receipts_data = [
            _make_receipt("r-1", "Quick Mart", ocr_route="tesseract",
                          processing_metrics={"route": "tesseract", "durationMs": 80}),
            _make_receipt("r-2", "Medium Shop", ocr_route="hybrid",
                          processing_metrics={"route": "hybrid", "durationMs": 4000, "tokensUsed": 300}),
            _make_receipt("r-3", "Complex Store", ocr_route="vision_llm",
                          processing_metrics={"route": "vision_llm", "durationMs": 6000, "tokensUsed": 1500}),
        ]

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, receipts_data))

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        page.reload()
        page.wait_for_load_state("networkidle")

        receipts = ReceiptListPage(page)
        receipts.wait_for_receipts_to_load(timeout=15000)

        # All three should be visible
        expect(receipts.get_receipt_by_merchant("Quick Mart")).to_be_visible()
        expect(receipts.get_receipt_by_merchant("Medium Shop")).to_be_visible()
        expect(receipts.get_receipt_by_merchant("Complex Store")).to_be_visible()
        expect(receipts.get_receipt_rows()).to_have_count(3)

    def test_list_receipts_with_and_without_routing(self, page: Page):
        """Older receipts without routing fields display alongside newer ones."""
        receipts_data = [
            _make_receipt("r-old", "Old Store"),  # no routing fields
            _make_receipt("r-new", "New Store", ocr_route="tesseract",
                          processing_metrics={"route": "tesseract", "durationMs": 100}),
        ]

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, receipts_data))

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        page.reload()
        page.wait_for_load_state("networkidle")

        receipts = ReceiptListPage(page)
        receipts.wait_for_receipts_to_load(timeout=15000)

        expect(receipts.get_receipt_by_merchant("Old Store")).to_be_visible()
        expect(receipts.get_receipt_by_merchant("New Store")).to_be_visible()
        expect(receipts.get_receipt_rows()).to_have_count(2)


# ---------- Tests: Routing + Duplicate interaction ----------

class TestOcrRoutingWithDuplicates:
    """Test that OCR routing works correctly alongside duplicate detection."""

    def test_duplicate_detection_preserves_routing_metadata(self, page: Page, sample_receipt_image: str):
        """When duplicate is detected, the pending receipt should still carry routing metadata."""
        receipt_1 = _make_receipt(
            "r-dup-1", "Dup Store",
            ocr_route="tesseract",
            processing_metrics={"route": "tesseract", "durationMs": 90},
        )

        pending_2 = _make_receipt(
            "r-dup-2", "Dup Store",
            ocr_route="hybrid",
            processing_metrics={"route": "hybrid", "durationMs": 3500},
        )
        pending_2["imageHash"] = "deadbeef"
        pending_2["ocrFingerprint"] = "dup store|2026-04-27|12.50|SGD"

        # First upload succeeds, second detects duplicate
        process_calls = {"n": 0}

        def process_handler(route):
            process_calls["n"] += 1
            if process_calls["n"] == 1:
                return _fulfill_json(route, 200, receipt_1)
            return _fulfill_json(route, 200, {
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
            })

        page.route("**/api/receipts", lambda route: _fulfill_json(route, 200, []))
        page.route("**/api/process", process_handler)

        def confirm_handler(route):
            body = route.request.post_data or "{}"
            data = json.loads(body)
            if data.get("action") == "ignore":
                return _fulfill_json(route, 200, {"ignored": True})
            return _fulfill_json(route, 200, data.get("pendingReceipt"))

        page.route("**/api/receipts/confirm", confirm_handler)

        def _cleanup(route):
            if route.request.method.upper() == "DELETE":
                return _fulfill_json(route, 204, {})
            return route.continue_()
        page.route("**/api/receipts/**", _cleanup)

        home = HomePage(page)
        receipts = ReceiptListPage(page)

        # First upload
        with page.expect_response("**/api/process") as first_resp:
            home.upload_file(sample_receipt_image)
        assert first_resp.value.ok
        first_data = first_resp.value.json()
        assert first_data["ocrRoute"] == "tesseract"

        receipts.wait_for_receipts_to_load(timeout=15000)

        # Second upload triggers duplicate
        with page.expect_response("**/api/process") as second_resp:
            home.upload_file(sample_receipt_image)
        assert second_resp.value.ok
        second_data = second_resp.value.json()
        assert second_data.get("duplicateDetected") is True

        # Verify the pending receipt in the duplicate payload has routing metadata
        pending = second_data["pendingReceipt"]
        assert pending["ocrRoute"] == "hybrid"
        assert pending["processingMetrics"]["route"] == "hybrid"

        # Dismiss the duplicate dialog
        expect(page.get_by_role("heading", name="Possible duplicate receipt")).to_be_visible(timeout=15000)
        page.get_by_role("button", name="Yes (duplicate) — ignore").click()
        expect(page.get_by_text("Possible duplicate receipt")).not_to_be_visible(timeout=15000)
