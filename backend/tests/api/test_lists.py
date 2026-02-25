from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
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

    def test_create_list_cap_returns_400(self):
        """Creating beyond the 3-list cap must return 400 with a clear message."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.lists.ListsService") as mock_cls:
                mock_svc = AsyncMock()
                mock_svc.create.side_effect = ValueError("Maximum 3 lists per user.")
                mock_cls.return_value = mock_svc
                response = client.post("/lists/", json={"name": "Fourth List"})
            assert response.status_code == 400
            assert "3" in response.json()["detail"] or "Maximum" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_create_list_uses_user_db(self):
        """Route must use per-request JWT client."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.lists.ListsService") as mock_cls:
                mock_svc = AsyncMock()
                mock_svc.create.return_value = MagicMock(
                    model_dump=lambda: {"id": "l1", "name": "Fav"}
                )
                mock_cls.return_value = mock_svc
                client.post("/lists/", json={"name": "Fav"})
                mock_cls.assert_called_once_with(db=mock_db)
        finally:
            app.dependency_overrides.clear()

    def test_delete_list_calls_service_without_user_id(self):
        """DELETE /lists/{id} must call service.delete(list_id=...) — no user_id param."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.lists.ListsService") as mock_cls:
                mock_svc = AsyncMock()
                mock_cls.return_value = mock_svc
                client.delete("/lists/list-1")
                mock_svc.delete.assert_called_once_with(list_id="list-1")
        finally:
            app.dependency_overrides.clear()

    def test_add_shop_calls_service_without_user_id(self):
        """POST /lists/{id}/shops must call service.add_shop(list_id=..., shop_id=...) — no user_id."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.lists.ListsService") as mock_cls:
                mock_svc = AsyncMock()
                mock_svc.add_shop.return_value = MagicMock(
                    model_dump=lambda: {"list_id": "list-1", "shop_id": "shop-1",
                                        "added_at": "2026-02-25T00:00:00"}
                )
                mock_cls.return_value = mock_svc
                client.post("/lists/list-1/shops", json={"shop_id": "shop-1"})
                mock_svc.add_shop.assert_called_once_with(list_id="list-1", shop_id="shop-1")
        finally:
            app.dependency_overrides.clear()

    def test_remove_shop_calls_service_without_user_id(self):
        """DELETE /lists/{id}/shops/{shop_id} must call service.remove_shop without user_id."""
        mock_db = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with patch("api.lists.ListsService") as mock_cls:
                mock_svc = AsyncMock()
                mock_cls.return_value = mock_svc
                client.delete("/lists/list-1/shops/shop-1")
                mock_svc.remove_shop.assert_called_once_with(list_id="list-1", shop_id="shop-1")
        finally:
            app.dependency_overrides.clear()
