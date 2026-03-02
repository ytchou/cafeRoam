from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.admin_shops import router
from api.deps import get_current_user
from tests.factories import make_shop_row

# Create a test app with just this router
test_app = FastAPI()
test_app.include_router(router)
client = TestClient(test_app)

_ADMIN_ID = "admin-user-id"


def _admin_user():
    return {"id": _ADMIN_ID}


class TestAdminShopsList:
    def test_requires_admin(self):
        """Non-admin user gets 403 when listing shops."""
        test_app.dependency_overrides[get_current_user] = lambda: {"id": "regular-user"}
        try:
            with patch("api.admin_shops.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")
            assert response.status_code == 403
        finally:
            test_app.dependency_overrides.clear()

    def test_lists_all_shops(self):
        """Admin user can list all shops with pagination."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            shops = [make_shop_row(id="shop-1", name="Coffee A"), make_shop_row(id="shop-2", name="Coffee B")]
            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(data=shops, count=2)
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")
            assert response.status_code == 200
            data = response.json()
            assert len(data["shops"]) == 2
        finally:
            test_app.dependency_overrides.clear()

    def test_filters_by_processing_status(self):
        """Admin can filter shops by processing_status."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(data=[], count=0)
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops?processing_status=failed")
            assert response.status_code == 200
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopCreate:
    def test_creates_shop_with_manual_source(self):
        """Admin creates a manually-entered shop with audit logging."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=[{"id": "new-shop-1", "name": "\u624b\u6c96\u54a8\u5561\u5e97"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
                patch("api.admin_shops.log_admin_action") as mock_audit,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops",
                    json={"name": "\u624b\u6c96\u54a8\u5561\u5e97", "address": "\u53f0\u5317\u5e02\u4e2d\u5c71\u5340", "latitude": 25.05, "longitude": 121.52},
                )
            assert response.status_code == 201
            mock_audit.assert_called_once()
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopDetail:
    def test_returns_shop_with_tags_and_photos(self):
        """Admin can view full shop detail including tags and photos."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value = MagicMock(
                data={"id": "shop-1", "name": "Test", "processing_status": "live"}
            )
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops/shop-1")
            assert response.status_code == 200
            data = response.json()
            assert data["shop"]["id"] == "shop-1"
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopUpdate:
    def test_updates_shop_and_sets_manually_edited_at(self):
        """When admin updates a shop, manually_edited_at is set to protect from pipeline overwrite."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "shop-1", "name": "Updated"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
                patch("api.admin_shops.log_admin_action"),
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.put(
                    "/admin/shops/shop-1",
                    json={"name": "Updated Name"},
                )
            assert response.status_code == 200
            update_call = mock_db.table.return_value.update
            update_data = update_call.call_args[0][0]
            assert "manually_edited_at" in update_data
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopEnqueue:
    def test_enqueues_enrich_job(self):
        """Admin can manually trigger a pipeline job for a shop."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
                patch("api.admin_shops.log_admin_action"),
                patch("api.admin_shops.JobQueue") as mock_queue_cls,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                mock_queue = MagicMock()
                mock_queue.enqueue = AsyncMock(return_value="job-1")
                mock_queue_cls.return_value = mock_queue
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "enrich_shop"},
                )
            assert response.status_code == 200
            assert response.json()["job_id"] == "job-1"
        finally:
            test_app.dependency_overrides.clear()

    def test_rejects_duplicate_pending_job(self):
        """If a pending job of the same type already exists, return 409."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "existing-job"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "enrich_shop"},
                )
            assert response.status_code == 409
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopSearchRank:
    def test_returns_rank_position(self):
        """Admin can check where a shop ranks for a given search query."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            search_results = [
                {"id": "other-1", "similarity": 0.9},
                {"id": "other-2", "similarity": 0.85},
                {"id": "shop-1", "similarity": 0.8},
            ]
            mock_db.rpc.return_value.execute.return_value = MagicMock(data=search_results)
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.admin_shops.settings") as mock_settings,
                patch("api.admin_shops.get_embeddings_provider") as mock_emb,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                mock_provider = MagicMock()
                mock_provider.embed = AsyncMock(return_value=[0.1] * 1536)
                mock_emb.return_value = mock_provider
                response = client.get("/admin/shops/shop-1/search-rank?query=quiet+coffee")
            assert response.status_code == 200
            data = response.json()
            assert data["rank"] == 3
            assert data["total_results"] == 3
        finally:
            test_app.dependency_overrides.clear()
