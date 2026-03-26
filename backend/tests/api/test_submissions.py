from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)


def test_submit_shop_requires_auth():
    response = client.post(
        "/submissions", json={"google_maps_url": "https://maps.google.com/?cid=123"}
    )
    assert response.status_code in (401, 403)


def test_submit_shop_rejects_invalid_url():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[]
    )
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    app.dependency_overrides[get_user_db] = lambda: mock_db
    try:
        response = client.post(
            "/submissions",
            json={"google_maps_url": "not-a-url"},
        )
        assert response.status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_submit_shop_cleans_up_on_enqueue_failure():
    """If queue.enqueue raises, the shop should be deleted and submission marked failed."""
    mock_user_db = MagicMock()
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    # Rate limit check: 0 submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = (
        MagicMock(data=[], count=0)
    )
    mock_user_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "sub-1"}]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        mock_svc_db = MagicMock()
        mock_svc_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "shop-1"}]
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
        # Shop should have been deleted
        mock_svc_db.table.return_value.delete.return_value.eq.assert_called()
        # Submission should have been marked failed
        mock_svc_db.table.return_value.update.return_value.eq.assert_called()
    finally:
        app.dependency_overrides.clear()


def test_submit_shop_success():
    mock_user_db = MagicMock()
    # Duplicate check returns no existing submission
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    # Rate limit check: 0 submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = (
        MagicMock(data=[], count=0)
    )
    # Submission insert
    mock_user_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "sub-1"}]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        mock_svc_db = MagicMock()
        mock_svc_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "shop-1"}]
        )
        with (
            patch("api.submissions.get_service_role_client", return_value=mock_svc_db),
            patch("api.submissions.JobQueue") as mock_queue_cls,
        ):
            mock_queue_cls.return_value.enqueue = AsyncMock(return_value="job-1")
            response = client.post(
                "/submissions",
                json={"google_maps_url": "https://maps.google.com/?cid=123"},
            )

        assert response.status_code == 201
        data = response.json()
        assert "submission_id" in data
    finally:
        app.dependency_overrides.clear()


def test_submit_shop_rate_limited_at_5_per_day():
    """A user who has already submitted 5 shops today gets a 429."""
    mock_user_db = MagicMock()
    # Duplicate check returns no existing submission
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
        MagicMock(data=[])
    )
    # Rate limit check: 5 submissions today
    mock_user_db.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = (
        MagicMock(data=[], count=5)
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
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


def test_get_submissions_returns_user_history():
    """GET /submissions returns the current user's submissions."""
    mock_user_db = MagicMock()
    mock_user_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
        data=[
            {"id": "sub-1", "google_maps_url": "https://maps.google.com/?cid=1", "status": "live"},
            {"id": "sub-2", "google_maps_url": "https://maps.google.com/?cid=2", "status": "pending"},
        ]
    )

    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
    app.dependency_overrides[get_user_db] = lambda: mock_user_db
    try:
        response = client.get("/submissions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
    finally:
        app.dependency_overrides.clear()
