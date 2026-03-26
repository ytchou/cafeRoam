from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_admin_db, get_current_user, get_user_db
from main import app
from providers.analytics import get_analytics_provider

client = TestClient(app)


def _mock_admin_db():
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute = MagicMock()
    return mock


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
        app.dependency_overrides[get_current_user] = lambda: {"id": "usr_a1b2c3d4e5f6"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        app.dependency_overrides[get_admin_db] = lambda: _mock_admin_db()
        try:
            with patch("api.search.get_embeddings_provider") as mock_emb_factory:
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb.dimensions = 1536
                mock_emb_factory.return_value = mock_emb
                response = client.get(
                    "/search?text=good+wifi",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200
                body = response.json()
                assert "results" in body
                mock_db.rpc.assert_called_once()
        finally:
            app.dependency_overrides.clear()

    def test_search_logs_event_to_postgres(self):
        """When a user searches, a search_event row is inserted asynchronously."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        mock_admin_db = _mock_admin_db()

        app.dependency_overrides[get_current_user] = lambda: {"id": "user-a1b2c3"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        app.dependency_overrides[get_admin_db] = lambda: mock_admin_db
        try:
            with patch("api.search.get_embeddings_provider") as mock_emb_factory:
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb_factory.return_value = mock_emb

                response = client.get(
                    "/search?text=巴斯克蛋糕",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200

                mock_admin_db.table.assert_called_with("search_events")
                insert_call = mock_admin_db.table.return_value.insert.call_args
                assert insert_call is not None
                row = insert_call[0][0]
                assert row["query_text"] == "巴斯克蛋糕"
                assert row["query_type"] == "item_specific"
                assert row["result_count"] == 0
                assert row["mode_filter"] is None
                assert "user-a1b2c3" not in row["user_id_anon"]
        finally:
            app.dependency_overrides.clear()

    def test_search_response_includes_query_metadata(self):
        """Search response must include query_type and result_count for frontend analytics."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        app.dependency_overrides[get_current_user] = lambda: {"id": "usr_b2c3d4e5f6a1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        app.dependency_overrides[get_admin_db] = lambda: _mock_admin_db()
        try:
            with patch("api.search.get_embeddings_provider") as mock_emb_factory:
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb_factory.return_value = mock_emb
                response = client.get(
                    "/search?text=matcha+latte",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200
                body = response.json()
                assert "results" in body
                assert "query_type" in body
                assert "result_count" in body
                assert isinstance(body["result_count"], int)
        finally:
            app.dependency_overrides.clear()

    def test_search_results_include_community_summary(self):
        """When a shop has a community summary, users see it in search results."""
        mock_rpc_row = {
            "id": "b8f3c2a1-4e5d-4a6b-8c7f-2e1d3f4a5b6c",
            "name": "芭蕉葉咖啡",
            "address": "台北市大安區忠孝東路四段216巷27號",
            "city": "台北市",
            "mrt": "忠孝敦化站",
            "latitude": 25.0411,
            "longitude": 121.5509,
            "rating": 4.7,
            "review_count": 128,
            "description": "靜謐巷弄內的精品咖啡館",
            "slug": "banana-leaf-coffee-daan",
            "processing_status": "live",
            "created_at": "2025-06-01T10:00:00+00:00",
            "updated_at": "2026-01-15T08:30:00+00:00",
            "photo_urls": [],
            "taxonomy_tags": [],
            "similarity": 0.85,
            "community_summary": (
                "芭蕉葉咖啡以安靜角落座位和精心烘焙的單品咖啡著稱，"
                "是大安區最受上班族喜愛的工作咖啡館之一"
            ),
        }
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(
                    return_value=MagicMock(data=[mock_rpc_row])
                )
            )
        )
        app.dependency_overrides[get_current_user] = lambda: {"id": "usr_d4e5f6a1b2c3"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        app.dependency_overrides[get_admin_db] = lambda: _mock_admin_db()
        try:
            with patch("api.search.get_embeddings_provider") as mock_emb_factory:
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb.dimensions = 1536
                mock_emb_factory.return_value = mock_emb
                response = client.get(
                    "/search?text=安靜工作咖啡館",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200
                body = response.json()
                assert body["result_count"] == 1
                shop = body["results"][0]["shop"]
                assert shop["communitySummary"] == (
                    "芭蕉葉咖啡以安靜角落座位和精心烘焙的單品咖啡著稱，"
                    "是大安區最受上班族喜愛的工作咖啡館之一"
                )
        finally:
            app.dependency_overrides.clear()

    def test_search_no_longer_fires_posthog_directly(self):
        """After migration, GET /search should NOT call analytics.track()."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        mock_analytics = MagicMock()
        app.dependency_overrides[get_current_user] = lambda: {"id": "usr_c3d4e5f6a1b2"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        app.dependency_overrides[get_admin_db] = lambda: _mock_admin_db()
        app.dependency_overrides[get_analytics_provider] = lambda: mock_analytics
        try:
            with patch("api.search.get_embeddings_provider") as mock_emb_factory:
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb_factory.return_value = mock_emb
                client.get(
                    "/search?text=wifi",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                mock_analytics.track.assert_not_called()
        finally:
            app.dependency_overrides.clear()
