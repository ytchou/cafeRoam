from unittest.mock import MagicMock

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)


def _auth_overrides(user_id: str = "user-1") -> MagicMock:
    """Set up dependency overrides for an authenticated user. Returns the mock db client."""
    mock_db = MagicMock()
    # Chain: table().update().eq().execute()
    mock_db.table.return_value = mock_db
    mock_db.update.return_value = mock_db
    mock_db.select.return_value = mock_db
    mock_db.eq.return_value = mock_db
    mock_db.single.return_value = mock_db
    app.dependency_overrides[get_current_user] = lambda: {"id": user_id}
    app.dependency_overrides[get_user_db] = lambda: mock_db
    return mock_db


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


class TestConsentRoute:
    def test_consent_sets_pdpa_timestamp(self):
        mock_db = _auth_overrides()
        mock_db.execute.return_value = MagicMock(
            data=[{"id": "user-1", "pdpa_consent_at": "2026-02-25T00:00:00+00:00"}]
        )
        try:
            response = client.post("/auth/consent")
            assert response.status_code == 200
            data = response.json()
            assert "pdpa_consent_at" in data
            # Verify the update was called on the profiles table
            mock_db.table.assert_called_with("profiles")
        finally:
            _clear_overrides()

    def test_consent_rejects_unauthenticated(self):
        response = client.post("/auth/consent")
        assert response.status_code == 401

    def test_consent_is_idempotent(self):
        mock_db = _auth_overrides()
        mock_db.execute.return_value = MagicMock(
            data=[{"id": "user-1", "pdpa_consent_at": "2026-02-25T00:00:00+00:00"}]
        )
        try:
            response1 = client.post("/auth/consent")
            response2 = client.post("/auth/consent")
            assert response1.status_code == 200
            assert response2.status_code == 200
        finally:
            _clear_overrides()


class TestDeleteAccountRoute:
    def test_delete_account_sets_deletion_timestamp(self):
        mock_db = _auth_overrides()
        mock_db.execute.return_value = MagicMock(
            data=[{"id": "user-1", "deletion_requested_at": "2026-02-25T00:00:00+00:00"}]
        )
        try:
            response = client.delete("/auth/account")
            assert response.status_code == 200
            data = response.json()
            assert "deletion_requested_at" in data
            mock_db.table.assert_called_with("profiles")
        finally:
            _clear_overrides()

    def test_delete_account_rejects_unauthenticated(self):
        response = client.delete("/auth/account")
        assert response.status_code == 401


class TestCancelDeletionRoute:
    def test_cancel_deletion_clears_timestamp(self):
        mock_db = _auth_overrides()
        # First call (select+single) returns profile with deletion_requested_at set
        # Second call (update) returns the cleared profile
        mock_db.execute.side_effect = [
            MagicMock(data={"id": "user-1", "deletion_requested_at": "2026-02-25T00:00:00+00:00"}),
            MagicMock(data=[{"id": "user-1", "deletion_requested_at": None}]),
        ]
        try:
            response = client.post("/auth/cancel-deletion")
            assert response.status_code == 200
            data = response.json()
            assert data["deletion_requested_at"] is None
        finally:
            _clear_overrides()

    def test_cancel_deletion_404_when_not_pending(self):
        mock_db = _auth_overrides()
        # Select+single returns profile with no deletion_requested_at
        mock_db.execute.return_value = MagicMock(
            data={"id": "user-1", "deletion_requested_at": None}
        )
        try:
            response = client.post("/auth/cancel-deletion")
            assert response.status_code == 404
            assert "not pending" in response.json()["detail"].lower()
        finally:
            _clear_overrides()
