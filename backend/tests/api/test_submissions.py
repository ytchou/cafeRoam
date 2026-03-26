from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)

_USER_ID = "a1b2c3d4-0001-0001-0001-000000000001"
_SUBMISSION_ID = "b2c3d4e5-0002-0002-0002-000000000002"
_SHOP_ID = "c3d4e5f6-0003-0003-0003-000000000003"
_JOB_ID = "d4e5f6a7-0004-0004-0004-000000000004"


def test_unauthenticated_user_cannot_submit_a_shop():
    response = client.post(
        "/submissions", json={"google_maps_url": "https://maps.google.com/?cid=123"}
    )
    assert response.status_code in (401, 403)


def test_submitting_a_non_google_maps_url_returns_422():
    mock_db = MagicMock()
    app.dependency_overrides[get_current_user] = lambda: {"id": _USER_ID}
    app.dependency_overrides[get_user_db] = lambda: mock_db
    try:
        response = client.post(
            "/submissions",
            json={"google_maps_url": "not-a-url"},
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_failed_enqueue_triggers_cleanup_and_returns_500():
    """If queue.enqueue raises, the shop should be deleted and submission marked failed."""
    mock_user_db = MagicMock()
    # Rate limit check: 0 active submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.not_.in_.return_value.execute.return_value = (
        MagicMock(data=[], count=0)
    )
    # Duplicate check: URL not seen before
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    mock_user_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": _SUBMISSION_ID}]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": _USER_ID}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        mock_svc_db = MagicMock()
        mock_svc_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": _SHOP_ID}]
        )
        with (
            patch("api.submissions.get_service_role_client", return_value=mock_svc_db),
            patch("api.submissions.JobQueue") as mock_queue_cls,
        ):
            mock_queue_cls.return_value.enqueue = AsyncMock(side_effect=RuntimeError("DB down"))
            response = client.post(
                "/submissions",
                json={"google_maps_url": "https://maps.google.com/?cid=123"},
            )

        assert response.status_code == 500
        mock_svc_db.table.return_value.delete.return_value.eq.assert_called()
        mock_svc_db.table.return_value.update.return_value.eq.assert_called()
    finally:
        app.dependency_overrides.clear()


def test_user_can_submit_a_valid_google_maps_url():
    mock_user_db = MagicMock()
    # Rate limit check: 0 active submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.not_.in_.return_value.execute.return_value = (
        MagicMock(data=[], count=0)
    )
    # Duplicate check: URL not seen before
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    mock_user_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": _SUBMISSION_ID}]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": _USER_ID}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        mock_svc_db = MagicMock()
        mock_svc_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": _SHOP_ID}]
        )
        with (
            patch("api.submissions.get_service_role_client", return_value=mock_svc_db),
            patch("api.submissions.JobQueue") as mock_queue_cls,
        ):
            mock_queue_cls.return_value.enqueue = AsyncMock(return_value=_JOB_ID)
            response = client.post(
                "/submissions",
                json={"google_maps_url": "https://maps.google.com/?cid=123"},
            )

        assert response.status_code == 201
        data = response.json()
        assert "submission_id" in data
    finally:
        app.dependency_overrides.clear()


def test_user_is_rate_limited_after_5_active_submissions_in_a_day():
    """A user who has 5 non-rejected/failed submissions today gets a 429."""
    mock_user_db = MagicMock()
    # Rate limit check: 5 active submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.not_.in_.return_value.execute.return_value = (
        MagicMock(data=[], count=5)
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": _USER_ID}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        response = client.post(
            "/submissions",
            json={"google_maps_url": "https://maps.google.com/?cid=999"},
        )
        assert response.status_code == 429
        assert "5" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_user_sees_their_submission_history():
    """GET /submissions returns the current user's submissions."""
    mock_user_db = MagicMock()
    mock_user_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": _SUBMISSION_ID,
                "google_maps_url": "https://maps.google.com/?cid=1",
                "status": "live",
            },
            {
                "id": "e5f6a7b8-0005-0005-0005-000000000005",
                "google_maps_url": "https://maps.google.com/?cid=2",
                "status": "pending",
            },
        ]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": _USER_ID}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        response = client.get("/submissions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    finally:
        app.dependency_overrides.clear()
