from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.admin_shops import router
from api.deps import get_current_user
from providers.embeddings import get_embeddings_provider
from tests.factories import make_shop_row

# Create a test app with just this router
test_app = FastAPI()
test_app.include_router(router)
client = TestClient(test_app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-123456789abc"


def _admin_user():
    return {"id": _ADMIN_ID}


class TestAdminShopsList:
    def test_non_admin_cannot_list_shops(self):
        """Non-admin user gets 403 when listing shops."""
        test_app.dependency_overrides[get_current_user] = lambda: {"id": "regular-user"}
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")
            assert response.status_code == 403
        finally:
            test_app.dependency_overrides.clear()

    def test_admin_can_list_all_shops(self):
        """Admin user can list all shops with pagination."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            shops = [
                make_shop_row(id="shop-1", name="田田咖啡"),
                make_shop_row(id="shop-2", name="蟻窩咖啡"),
            ]
            select_rv = mock_db.table.return_value.select.return_value
            select_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=shops, count=2
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")
            assert response.status_code == 200
            data = response.json()
            assert len(data["shops"]) == 2
        finally:
            test_app.dependency_overrides.clear()

    def test_admin_can_filter_shops_by_processing_status(self):
        """Admin can filter shops by processing_status."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            eq_rv = select_rv.eq.return_value
            eq_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[], count=0
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops?processing_status=failed")
            assert response.status_code == 200
        finally:
            test_app.dependency_overrides.clear()

    def test_admin_shops_includes_current_job_when_active(self):
        """When a shop has a CLAIMED job, current_job is returned in the shop list."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            shop = make_shop_row(id="shop-abc", name="活躍工作咖啡館")

            shops_table_mock = MagicMock()
            select_rv = shops_table_mock.select.return_value
            select_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[shop], count=1
            )

            jobs_table_mock = MagicMock()
            jobs_table_mock.select.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "job_type": "summarize_reviews",
                        "status": "claimed",
                        "payload": {"shop_id": "shop-abc"},
                    }
                ]
            )

            def table_side_effect(table_name):
                if table_name == "job_queue":
                    return jobs_table_mock
                return shops_table_mock

            mock_db.table.side_effect = table_side_effect

            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")

            assert response.status_code == 200
            shops_data = response.json()["shops"]
            assert len(shops_data) == 1
            assert shops_data[0]["current_job"] == {
                "job_type": "summarize_reviews",
                "status": "claimed",
            }
        finally:
            test_app.dependency_overrides.clear()

    def test_admin_shops_current_job_is_null_when_no_active_job(self):
        """When no active job exists for a shop, current_job is null in the shop list."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            shop = make_shop_row(id="shop-xyz", name="平靜咖啡館")

            shops_table_mock = MagicMock()
            select_rv = shops_table_mock.select.return_value
            select_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[shop], count=1
            )

            jobs_table_mock = MagicMock()
            jobs_table_mock.select.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )

            def table_side_effect(table_name):
                if table_name == "job_queue":
                    return jobs_table_mock
                return shops_table_mock

            mock_db.table.side_effect = table_side_effect

            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops")

            assert response.status_code == 200
            shops_data = response.json()["shops"]
            assert len(shops_data) == 1
            assert shops_data[0]["current_job"] is None
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopCreate:
    def test_admin_creates_shop_with_manual_source_and_audit_log(self):
        """Admin creates a manually-entered shop with audit logging."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=[{"id": "new-shop-1", "name": "手沖咖啡店"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops",
                    json={
                        "name": "手沖咖啡店",
                        "address": "台北市中山區",
                        "latitude": 25.05,
                        "longitude": 121.52,
                    },
                )
            assert response.status_code == 201
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopDetail:
    def test_admin_can_view_shop_with_tags_and_photos(self):
        """Admin can view full shop detail including tags and photos."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            select_rv.eq.return_value.single.return_value.execute.return_value = MagicMock(
                data={"id": "shop-1", "name": "山小孩咖啡", "processing_status": "live"}
            )
            select_rv.eq.return_value.execute.return_value = MagicMock(data=[])
            select_rv.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops/shop-1")
            assert response.status_code == 200
            data = response.json()
            assert data["shop"]["id"] == "shop-1"
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopUpdate:
    def test_admin_update_sets_manually_edited_at_timestamp(self):
        """When admin updates a shop, manually_edited_at is set."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": "shop-1", "name": "Updated"}])
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.put(
                    "/admin/shops/shop-1",
                    json={"name": "Updated Name"},
                )
            assert response.status_code == 200
            update_call = mock_db.table.return_value.update
            update_data = update_call.call_args.args[0]
            assert "manually_edited_at" in update_data
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopEnqueue:
    def test_admin_can_trigger_enrich_pipeline_job(self):
        """Admin can manually trigger a pipeline job for a shop."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            eq3_rv = select_rv.eq.return_value.eq.return_value.eq.return_value
            eq3_rv.execute.return_value = MagicMock(data=[])
            # JobQueue.enqueue inserts a row and returns its id
            mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=[{"id": "job-1"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "enrich_shop"},
                )
            assert response.status_code == 200
            assert response.json()["job_id"] == "job-1"
        finally:
            test_app.dependency_overrides.clear()

    def test_admin_can_trigger_scrape_batch_job(self):
        """Admin can manually trigger a SCRAPE_BATCH job for a single shop."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # No duplicate check for SCRAPE_BATCH (skipped)
            # Shop row lookup for google_maps_url
            shop_row_mock = MagicMock()
            shop_row_mock.data = {"google_maps_url": "https://maps.google.com/?cid=42"}
            (
                mock_db.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value
            ) = shop_row_mock
            # JobQueue.enqueue inserts and returns job id
            mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
                data=[{"id": "batch-job-1"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "scrape_batch"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["job_id"] == "batch-job-1"
            assert data["job_type"] == "scrape_batch"
        finally:
            test_app.dependency_overrides.clear()

    def test_duplicate_pending_job_returns_409(self):
        """If a pending job of the same type already exists, return 409."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            eq3_rv = select_rv.eq.return_value.eq.return_value.eq.return_value
            eq3_rv.execute.return_value = MagicMock(data=[{"id": "existing-job"}])
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "enrich_shop"},
                )
            assert response.status_code == 409
        finally:
            test_app.dependency_overrides.clear()

    def test_scrape_shop_job_type_is_not_allowed(self):
        """Sending scrape_shop job type to admin enqueue returns 400."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/shop-1/enqueue",
                    json={"job_type": "scrape_shop"},
                )
            assert response.status_code == 422
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopsRetry:
    def test_retryable_shops_are_reset_to_pending(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # SELECT returns 2 eligible shops
            mock_db.table.return_value.select.return_value.in_.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": "shop-1"}, {"id": "shop-2"}]
            )
            # UPDATE returns 2 updated rows
            mock_db.table.return_value.update.return_value.in_.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": "shop-1"}, {"id": "shop-2"}]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/retry",
                    json={"shop_ids": ["shop-1", "shop-2"]},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["reset"] == 2
            assert data["skipped"] == 0
        finally:
            test_app.dependency_overrides.clear()

    def test_non_retryable_shops_are_skipped(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # SELECT returns 0 eligible (both are "live")
            mock_db.table.return_value.select.return_value.in_.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/retry",
                    json={"shop_ids": ["shop-live-1", "shop-live-2"]},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["reset"] == 0
            assert data["skipped"] == 2
        finally:
            test_app.dependency_overrides.clear()

    def test_returns_400_when_more_than_50_ids(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            with (
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/retry",
                    json={"shop_ids": [f"shop-{i}" for i in range(51)]},
                )
            assert response.status_code == 400
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopsBulkReject:
    def test_pending_review_shops_are_rejected_with_reason(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # UPDATE shops returns 1 rejected row
            mock_db.table.return_value.update.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "shop-1"}]
            )
            # RPC cancel_shop_jobs
            mock_db.rpc.return_value.execute.return_value = MagicMock(data=None)
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/bulk-reject",
                    json={"shop_ids": ["shop-1"], "rejection_reason": "not_a_cafe"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["rejected"] == 1
            assert data["skipped"] == 0
        finally:
            test_app.dependency_overrides.clear()

    def test_non_pending_review_shops_are_skipped(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # UPDATE returns empty (shops were not pending_review)
            mock_db.table.return_value.update.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/bulk-reject",
                    json={"shop_ids": ["shop-live-1"], "rejection_reason": "not_a_cafe"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["rejected"] == 0
            assert data["skipped"] == 1
        finally:
            test_app.dependency_overrides.clear()

    def test_returns_400_when_more_than_50_ids(self):
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/bulk-reject",
                    json={
                        "shop_ids": [f"shop-{i}" for i in range(51)],
                        "rejection_reason": "not_a_cafe",
                    },
                )
            assert response.status_code == 400
        finally:
            test_app.dependency_overrides.clear()


class TestAdminShopSearchRank:
    def test_admin_can_check_shop_search_rank_for_a_query(self):
        """Admin can check where a shop ranks for a given search query."""
        mock_provider = MagicMock()
        mock_provider.embed = AsyncMock(return_value=[0.1] * 1536)
        test_app.dependency_overrides[get_current_user] = _admin_user
        test_app.dependency_overrides[get_embeddings_provider] = lambda: mock_provider
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
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops/shop-1/search-rank?query=quiet+coffee")
            assert response.status_code == 200
            data = response.json()
            assert data["rank"] == 3
            assert data["total_results"] == 3
        finally:
            test_app.dependency_overrides.clear()


class TestAdminPipelineStatus:
    def test_pipeline_status_includes_timed_out(self):
        """Pipeline status endpoint includes timed_out in the counts."""
        test_app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.execute.return_value.data = [
                {"processing_status": "live"},
                {"processing_status": "live"},
                {"processing_status": "timed_out"},
                {"processing_status": "pending"},
            ]
            with (
                patch("api.admin_shops.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/shops/pipeline-status")
            assert response.status_code == 200
            data = response.json()
            assert data["timed_out"] == 1
            assert data["live"] == 2
            assert data["pending"] == 1
        finally:
            test_app.dependency_overrides.clear()
