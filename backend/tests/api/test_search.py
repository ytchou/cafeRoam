import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user, get_user_db
from main import app

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
        app.dependency_overrides[get_current_user] = lambda: {"id": "user-1"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with (
                patch("api.search.get_embeddings_provider") as mock_emb_factory,
                patch("api.search.SearchService") as mock_cls,
                patch("api.search.get_admin_db", return_value=_mock_admin_db()),
                patch("api.search.get_analytics_provider", return_value=MagicMock()),
                patch("api.search.asyncio") as mock_asyncio,
            ):
                mock_asyncio.create_task = lambda coro: coro.close()
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

    def test_search_logs_event_to_postgres(self):
        """When a user searches, a search_event row is inserted asynchronously."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        mock_admin_db = _mock_admin_db()

        app.dependency_overrides[get_current_user] = lambda: {"id": "user-a1b2c3"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with (
                patch("api.search.get_embeddings_provider") as mock_emb_factory,
                patch("api.search.SearchService") as mock_cls,
                patch("api.search.get_admin_db", return_value=mock_admin_db),
                patch("api.search.get_analytics_provider") as mock_analytics_factory,
                patch("api.search.asyncio") as mock_asyncio,
            ):
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb_factory.return_value = mock_emb
                mock_svc = AsyncMock()
                mock_svc.search.return_value = []
                mock_cls.return_value = mock_svc
                mock_analytics = MagicMock()
                mock_analytics_factory.return_value = mock_analytics

                tasks_created = []
                mock_asyncio.create_task = lambda coro: tasks_created.append(coro)

                response = client.get(
                    "/search?text=巴斯克蛋糕",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200

                for coro in tasks_created:
                    asyncio.run(coro)

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

    def test_search_fires_posthog_event(self):
        """When a user searches, a search_submitted PostHog event is fired."""
        mock_db = MagicMock()
        mock_db.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        mock_admin_db = _mock_admin_db()

        app.dependency_overrides[get_current_user] = lambda: {"id": "user-a1b2c3"}
        app.dependency_overrides[get_user_db] = lambda: mock_db
        try:
            with (
                patch("api.search.get_embeddings_provider") as mock_emb_factory,
                patch("api.search.SearchService") as mock_cls,
                patch("api.search.get_admin_db", return_value=mock_admin_db),
                patch("api.search.get_analytics_provider") as mock_analytics_factory,
                patch("api.search.asyncio") as mock_asyncio,
            ):
                mock_emb = AsyncMock()
                mock_emb.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb_factory.return_value = mock_emb
                mock_svc = AsyncMock()
                mock_svc.search.return_value = []
                mock_cls.return_value = mock_svc
                mock_analytics = MagicMock()
                mock_analytics_factory.return_value = mock_analytics

                tasks_created = []
                mock_asyncio.create_task = lambda coro: tasks_created.append(coro)

                response = client.get(
                    "/search?text=latte&mode=work",
                    headers={"Authorization": "Bearer valid-jwt"},
                )
                assert response.status_code == 200

                for coro in tasks_created:
                    asyncio.run(coro)

                mock_analytics.track.assert_called_once()
                call_args = mock_analytics.track.call_args
                assert call_args[0][0] == "search_submitted"
                props = call_args[0][1]
                assert props["query_text"] == "latte"
                assert props["query_type"] == "item_specific"
                assert props["mode_chip_active"] == "work"
                assert props["result_count"] == 0
                assert call_args[1]["distinct_id"] is not None
        finally:
            app.dependency_overrides.clear()
