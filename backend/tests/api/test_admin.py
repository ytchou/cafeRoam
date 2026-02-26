from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)

_ADMIN_ID = "admin-user-id"


def _admin_user():
    return {"id": _ADMIN_ID}


def test_admin_overview_requires_auth():
    response = client.get("/admin/pipeline/overview")
    assert response.status_code in (401, 403)


def test_admin_overview_requires_admin_role():
    """Non-admin users should get 403."""
    app.dependency_overrides[get_current_user] = lambda: {"id": "regular-user"}
    try:
        mock_db = MagicMock()
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/overview")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_admin_overview_returns_counts():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_eq = mock_db.table.return_value.select.return_value.eq.return_value
        mock_eq.execute.return_value = MagicMock(data=[], count=0)
        mock_order = mock_db.table.return_value.select.return_value.order.return_value
        mock_order.limit.return_value.execute.return_value = MagicMock(data=[])
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/overview")
        assert response.status_code == 200
        data = response.json()
        assert "job_counts" in data
        assert "recent_submissions" in data
    finally:
        app.dependency_overrides.clear()


def test_retry_job_success():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": "job-1", "status": "failed"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/pipeline/retry/job-1")
        assert response.status_code == 200
        assert "re-queued" in response.json()["message"]
    finally:
        app.dependency_overrides.clear()


def test_retry_job_not_found():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/pipeline/retry/missing-job")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_retry_job_not_retryable():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": "job-2", "status": "completed"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/pipeline/retry/job-2")
        assert response.status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_reject_submission_success():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"shop_id": "shop-1"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/pipeline/reject/sub-1")
        assert response.status_code == 200
        assert "rejected" in response.json()["message"]
        # Verify shop deletion was triggered
        mock_db.table.return_value.delete.return_value.eq.assert_called_once()
    finally:
        app.dependency_overrides.clear()


def test_reject_submission_not_found():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.admin.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/pipeline/reject/missing-sub")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()
