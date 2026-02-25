from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)


class TestCheckinsAPI:
    def test_create_checkin_requires_auth(self):
        response = client.post(
            "/checkins",
            json={
                "shop_id": "shop-1",
                "photo_urls": ["https://example.com/photo.jpg"],
            },
        )
        assert response.status_code == 401

    def test_get_user_checkins_requires_auth(self):
        response = client.get("/checkins")
        assert response.status_code == 401

    def test_create_checkin_empty_photos_returns_400(self):
        """Empty photo_urls must return 400, not 500 (ValueError caught in route)."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.checkins.CheckInService") as mock_cls:
                mock_svc = AsyncMock()
                mock_svc.create.side_effect = ValueError(
                    "At least one photo is required for check-in"
                )
                mock_cls.return_value = mock_svc
                response = client.post(
                    "/checkins/",
                    json={
                        "shop_id": "shop-1",
                        "photo_urls": [],
                    },
                )
            assert response.status_code == 400
            assert "photo" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_create_checkin_uses_user_db(self):
        """Route must use per-request JWT client, not anon singleton."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.checkins.CheckInService") as mock_cls:
                mock_svc = AsyncMock()
                mock_svc.create.return_value = MagicMock(model_dump=lambda: {"id": "ci-1"})
                mock_cls.return_value = mock_svc
                client.post(
                    "/checkins/",
                    json={
                        "shop_id": "shop-1",
                        "photo_urls": ["https://example.com/photo.jpg"],
                    },
                )
                # Verify service was constructed with the user's DB client
                mock_cls.assert_called_once_with(db=mock_db)
        finally:
            app.dependency_overrides.clear()
