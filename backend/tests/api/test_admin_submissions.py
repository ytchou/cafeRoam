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
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(
                data=[
                    {
                        "id": "sub-1",
                        "status": "pending_review",
                        "shop_id": "shop-1",
                        "submitted_by": "user-1",
                    }
                ]
            )
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
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(
                data=[
                    {
                        "id": "sub-1",
                        "status": "pending_review",
                        "shop_id": "shop-1",
                        "submitted_by": "user-1",
                    }
                ]
            )
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


def test_reject_stores_canned_reason():
    """Rejecting a submission should store the rejection_reason on the submission."""
    _override_admin()
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": "sub-1", "status": "pending_review", "shop_id": "shop-1"}])
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{}])
        )
        mock_db.rpc.return_value.execute.return_value = MagicMock(data=[])

        with patch("api.admin.get_service_role_client", return_value=mock_db):
            response = client.post(
                "/admin/pipeline/reject/sub-1",
                json={"rejection_reason": "permanently_closed"},
            )

        assert response.status_code == 200
        # Verify update was called with rejection_reason
        update_calls = mock_db.table.return_value.update.call_args_list
        reasons = [
            c.args[0].get("rejection_reason")
            for c in update_calls
            if "rejection_reason" in c.args[0]
        ]
        assert "permanently_closed" in reasons
    finally:
        _clear()


def test_reject_sets_shop_rejected_not_deleted():
    """Rejecting should set shop processing_status to 'rejected', not delete the shop."""
    _override_admin()
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": "sub-1", "status": "pending_review", "shop_id": "shop-1"}])
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{}])
        )
        mock_db.rpc.return_value.execute.return_value = MagicMock(data=[])

        with patch("api.admin.get_service_role_client", return_value=mock_db):
            response = client.post(
                "/admin/pipeline/reject/sub-1",
                json={"rejection_reason": "not_a_cafe"},
            )

        assert response.status_code == 200
        # Verify shops table was updated (not deleted)
        table_calls = [c.args[0] for c in mock_db.table.call_args_list]
        assert "shops" in table_calls
        # Should NOT have called delete on shops
        mock_db.table.return_value.delete.return_value.eq.assert_not_called()
    finally:
        _clear()


def test_reject_accepts_pending_review_status():
    """The reject endpoint should accept submissions in 'pending_review' status."""
    _override_admin()
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": "sub-1", "status": "pending_review", "shop_id": "shop-1"}])
        )
        mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{}])
        )
        mock_db.rpc.return_value.execute.return_value = MagicMock(data=[])

        with patch("api.admin.get_service_role_client", return_value=mock_db):
            response = client.post(
                "/admin/pipeline/reject/sub-1",
                json={"rejection_reason": "duplicate"},
            )

        assert response.status_code == 200
    finally:
        _clear()
