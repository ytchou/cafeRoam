from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

client = TestClient(app)


class TestSearchAPI:
    def test_search_requires_auth(self):
        """GET /search should require auth."""
        response = client.get("/search?text=good+wifi")
        assert response.status_code == 401

    def test_search_uses_user_db(self):
        """Search route must use per-request JWT client."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with (
                patch("api.search.get_embeddings_provider") as mock_emb_factory,
                patch("api.search.SearchService") as mock_cls,
            ):
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb.dimensions = 1536
                mock_emb_factory.return_value = mock_emb
                mock_svc = AsyncMock()
                mock_svc.search.return_value = []
                mock_cls.return_value = mock_svc
                response = client.get(
                    "/search?text=good+wifi",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200
                mock_cls.assert_called_once_with(db=mock_db, embeddings=mock_emb)
        finally:
            app.dependency_overrides.clear()
