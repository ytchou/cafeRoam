from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestShopsAPI:
    def test_list_shops_is_public(self):
        """GET /shops should not require auth."""
        with patch("api.shops.get_supabase_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.table = MagicMock(return_value=MagicMock(
                select=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(data=[]))
                ))
            ))
            mock_sb.return_value = mock_client
            response = client.get("/shops")
            assert response.status_code == 200

    def test_get_shop_by_id_is_public(self):
        """GET /shops/{id} should not require auth."""
        with patch("api.shops.get_supabase_client") as mock_sb:
            mock_client = MagicMock()
            mock_client.table = MagicMock(return_value=MagicMock(
                select=MagicMock(return_value=MagicMock(
                    eq=MagicMock(return_value=MagicMock(
                        single=MagicMock(return_value=MagicMock(
                            execute=MagicMock(return_value=MagicMock(data={
                                "id": "shop-1", "name": "Test Cafe"
                            }))
                        ))
                    ))
                ))
            ))
            mock_sb.return_value = mock_client
            response = client.get("/shops/shop-1")
            assert response.status_code == 200
