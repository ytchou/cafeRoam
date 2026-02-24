from fastapi.testclient import TestClient

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
