from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestListsAPI:
    def test_create_list_requires_auth(self):
        response = client.post("/lists", json={"name": "Favorites"})
        assert response.status_code == 401

    def test_get_lists_requires_auth(self):
        response = client.get("/lists")
        assert response.status_code == 401

    def test_delete_list_requires_auth(self):
        response = client.delete("/lists/list-1")
        assert response.status_code == 401
