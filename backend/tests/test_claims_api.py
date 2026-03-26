from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _override_user():
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-123"}
    yield
    app.dependency_overrides.pop(get_current_user, None)


class TestSubmitClaim:
    def test_unauthenticated_returns_401(self, client):
        app.dependency_overrides.pop(get_current_user, None)
        resp = client.post(
            "/claims",
            json={
                "shopId": "shop-1",
                "contactName": "Alice Chen",
                "contactEmail": "alice@caferoam.tw",
                "role": "owner",
                "proofPhotoPath": "claim-proofs/shop-1/proof.jpg",
            },
        )
        assert resp.status_code == 401
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-123"}

    def test_successful_submission_returns_201(self, client):
        mock_svc = AsyncMock()
        mock_svc.submit_claim.return_value = {"id": "claim-abc"}

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"name": "Fika Fika Cafe"}

        with (
            patch("api.claims.get_claims_service", return_value=mock_svc),
            patch("api.claims.get_service_role_client", return_value=mock_db),
        ):
            resp = client.post(
                "/claims",
                json={
                    "shopId": "shop-1",
                    "contactName": "Alice Chen",
                    "contactEmail": "alice@caferoam.tw",
                    "role": "owner",
                    "proofPhotoPath": "claim-proofs/shop-1/proof.jpg",
                },
            )
        assert resp.status_code == 201
        assert resp.json()["claimId"] == "claim-abc"

    def test_duplicate_claim_returns_409(self, client):
        from fastapi import HTTPException

        mock_svc = AsyncMock()
        mock_svc.submit_claim.side_effect = HTTPException(
            status_code=409, detail="此咖啡廳已有待審核或已通過的認領申請"
        )

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {"name": "Fika Fika Cafe"}

        with (
            patch("api.claims.get_claims_service", return_value=mock_svc),
            patch("api.claims.get_service_role_client", return_value=mock_db),
        ):
            resp = client.post(
                "/claims",
                json={
                    "shopId": "shop-1",
                    "contactName": "Alice Chen",
                    "contactEmail": "alice@caferoam.tw",
                    "role": "owner",
                    "proofPhotoPath": "claim-proofs/shop-1/proof.jpg",
                },
            )
        assert resp.status_code == 409


class TestGetMyClaim:
    def test_returns_claim_status_for_user(self, client):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
            {"id": "claim-1", "status": "pending"}
        ]

        with patch("api.claims.get_service_role_client", return_value=mock_db):
            resp = client.get("/claims/me?shop_id=shop-1")
        assert resp.status_code == 200
        assert resp.json()["status"] == "pending"

    def test_returns_null_when_no_claim(self, client):
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

        with patch("api.claims.get_service_role_client", return_value=mock_db):
            resp = client.get("/claims/me?shop_id=shop-1")
        assert resp.status_code == 200
        assert resp.json()["id"] is None
        assert resp.json()["status"] is None
