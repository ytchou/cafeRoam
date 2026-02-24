from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


class TestSearchAPI:
    def test_search_requires_auth(self):
        """GET /search should require auth."""
        response = client.get("/search?text=good+wifi")
        assert response.status_code == 401

    def test_search_with_valid_auth(self):
        """GET /search with valid token should return results."""
        with (
            patch("api.deps.get_supabase_client") as mock_auth_sb,
            patch("api.search.get_supabase_client") as mock_search_sb,
            patch("api.search.get_embeddings_provider") as mock_emb_factory,
        ):
            # Mock auth
            mock_auth_client = MagicMock()
            mock_auth_client.auth.get_user = MagicMock(return_value=MagicMock(
                user=MagicMock(id="user-1", email="test@example.com")
            ))
            mock_auth_sb.return_value = mock_auth_client

            # Mock embeddings provider
            mock_emb = AsyncMock()
            mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
            mock_emb.dimensions = 1536
            mock_emb_factory.return_value = mock_emb

            # Mock search DB
            mock_search_client = MagicMock()
            mock_search_client.rpc = MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[]))
            ))
            mock_search_sb.return_value = mock_search_client

            response = client.get(
                "/search?text=good+wifi",
                headers={"Authorization": "Bearer valid-jwt"},
            )
            assert response.status_code == 200
