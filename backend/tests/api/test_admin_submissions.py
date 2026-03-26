from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import require_admin
from main import app

client = TestClient(app)


def _override_admin():
    app.dependency_overrides[require_admin] = lambda: {"id": "admin-1"}


def _clear():
    app.dependency_overrides.clear()


def test_approve_sets_shop_live_and_emits_feed():
    """Approving a pending_review submission should set the shop to live and emit an activity feed event."""
    _override_admin()
    try:
        mock_db = MagicMock()
        # Fetch submission: pending_review with shop_id and submitted_by
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "sub-1", "status": "pending_review", "shop_id": "shop-1", "submitted_by": "user-1"}]
        )
        # Conditional update succeeds
        mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[{"id": "sub-1"}]
        )
        # Shop name lookup
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"name": "Test Café"}
        )
        # Activity feed insert
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        with patch("api.admin.get_service_role_client", return_value=mock_db):
            response = client.post("/admin/pipeline/approve/sub-1")

        assert response.status_code == 200
        # Verify activity_feed table was referenced
        table_calls = [c.args[0] for c in mock_db.table.call_args_list]
        assert "activity_feed" in table_calls
        assert "shops" in table_calls
    finally:
        _clear()


def test_approve_accepts_pending_review_status():
    """The approve endpoint should accept submissions in 'pending_review' status."""
    _override_admin()
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[{"id": "sub-1", "status": "pending_review", "shop_id": "shop-1", "submitted_by": "user-1"}]
        )
        mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[{"id": "sub-1"}]
        )
        mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
            data={"name": "Test Café"}
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        with patch("api.admin.get_service_role_client", return_value=mock_db):
            response = client.post("/admin/pipeline/approve/sub-1")

        assert response.status_code == 200
    finally:
        _clear()
