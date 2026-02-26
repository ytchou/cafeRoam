from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)


def test_submit_shop_requires_auth():
    response = client.post("/submissions", json={"google_maps_url": "https://maps.google.com/?cid=123"})
    assert response.status_code in (401, 403)


def test_submit_shop_rejects_invalid_url():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
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


def test_submit_shop_success():
    mock_user_db = MagicMock()
    # Duplicate check returns no existing submission
    mock_user_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
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
