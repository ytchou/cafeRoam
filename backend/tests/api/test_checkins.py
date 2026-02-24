from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)


class TestCheckinsAPI:
    def test_create_checkin_requires_auth(self):
        response = client.post("/checkins", json={
            "shop_id": "shop-1",
            "photo_urls": ["https://example.com/photo.jpg"],
        })
        assert response.status_code == 401

    def test_get_user_checkins_requires_auth(self):
        response = client.get("/checkins")
        assert response.status_code == 401

    def test_create_checkin_empty_photos_returns_400(self):
        """Empty photo_urls must return 400, not 500 (ValueError caught in route)."""
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        try:
            with patch("api.checkins.CheckInService") as MockService, \
                 patch("api.checkins.get_supabase_client", return_value=MagicMock()):
                mock_svc = AsyncMock()
                mock_svc.create.side_effect = ValueError("At least one photo is required for check-in")
                MockService.return_value = mock_svc
                response = client.post("/checkins/", json={
                    "shop_id": "shop-1",
                    "photo_urls": [],
                })
            assert response.status_code == 400
            assert "photo" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()
