from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from api.deps import get_claims_service, require_admin
from main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _override_admin():
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}
    yield
    app.dependency_overrides.pop(require_admin, None)


class TestListClaims:
    def test_returns_list_of_pending_claims(self, client):
        mock_svc = AsyncMock()
        mock_svc.list_claims.return_value = [
            {
                "id": "claim-1",
                "status": "pending",
                "contact_name": "Alice Chen",
                "shops": {"name": "Fika Fika Cafe"},
            }
        ]
        app.dependency_overrides[get_claims_service] = lambda: mock_svc
        try:
            resp = client.get("/admin/claims")
        finally:
            app.dependency_overrides.pop(get_claims_service, None)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "claim-1"
        mock_svc.list_claims.assert_called_once_with(status="pending")


class TestApproveClaim:
    def test_approve_calls_service_and_returns_200(self, client):
        mock_svc = AsyncMock()
        app.dependency_overrides[get_claims_service] = lambda: mock_svc
        try:
            resp = client.post("/admin/claims/claim-1/approve")
        finally:
            app.dependency_overrides.pop(get_claims_service, None)
        assert resp.status_code == 200
        mock_svc.approve_claim.assert_called_once_with(
            claim_id="claim-1", admin_user_id="admin-1"
        )


class TestRejectClaim:
    def test_reject_without_reason_returns_422(self, client):
        resp = client.post("/admin/claims/claim-1/reject", json={})
        assert resp.status_code == 422

    def test_reject_with_reason_returns_200(self, client):
        mock_svc = AsyncMock()
        app.dependency_overrides[get_claims_service] = lambda: mock_svc
        try:
            resp = client.post(
                "/admin/claims/claim-1/reject",
                json={"rejectionReason": "invalid_proof"},
            )
        finally:
            app.dependency_overrides.pop(get_claims_service, None)
        assert resp.status_code == 200
        mock_svc.reject_claim.assert_called_once()
