from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    return TestClient(app)


def _make_shop_row(claim_status: str | None = None) -> dict[str, Any]:
    return {
        "id": "shop-1",
        "name": "Fika Fika Cafe",
        "slug": "fika-fika-cafe",
        "address": "台北市中山區伊通街33號",
        "city": "taipei",
        "mrt": "松江南京",
        "latitude": 25.0529,
        "longitude": 121.5332,
        "rating": 4.5,
        "review_count": 12,
        "description": "Northern European-inspired specialty coffee",
        "processing_status": "live",
        "mode_work": 0.8,
        "mode_rest": 0.6,
        "mode_social": 0.4,
        "community_summary": None,
        "created_at": "2026-01-15T10:30:00",
        "phone": "02-2507-0902",
        "website": "https://www.fikafika.com.tw",
        "opening_hours": "08:00-18:00",
        "price_range": "$$",
        "updated_at": "2026-03-01T14:00:00",
        "shop_photos": [{"url": "https://example.com/fika-interior.jpg"}],
        "shop_tags": [],
        "shop_claims": [{"status": claim_status}] if claim_status else [],
    }


def _mock_anon_client(shop_row: dict[str, Any]) -> MagicMock:
    db = MagicMock()
    (
        db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value
    ).data = [shop_row]
    return db


class TestShopDetailClaimStatus:
    """GET /shops/:id should include claimStatus from the shop_claims join."""

    def test_unclaimed_shop_returns_null_claim_status(self, client: TestClient):
        db = _mock_anon_client(_make_shop_row(claim_status=None))
        with patch("api.shops.get_anon_client", return_value=db):
            resp = client.get("/shops/shop-1")
        assert resp.status_code == 200
        assert resp.json()["claimStatus"] is None

    def test_approved_claim_surfaces_in_shop_detail(self, client: TestClient):
        db = _mock_anon_client(_make_shop_row(claim_status="approved"))
        with patch("api.shops.get_anon_client", return_value=db):
            resp = client.get("/shops/shop-1")
        assert resp.status_code == 200
        assert resp.json()["claimStatus"] == "approved"

    def test_pending_claim_surfaces_in_shop_detail(self, client: TestClient):
        db = _mock_anon_client(_make_shop_row(claim_status="pending"))
        with patch("api.shops.get_anon_client", return_value=db):
            resp = client.get("/shops/shop-1")
        assert resp.status_code == 200
        assert resp.json()["claimStatus"] == "pending"
