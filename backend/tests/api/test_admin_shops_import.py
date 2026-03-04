"""TDD tests for admin import trigger routes."""

import json
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.admin_shops import router
from api.deps import get_current_user

test_app = FastAPI()
test_app.include_router(router)
client = TestClient(test_app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-123456789abc"


def _admin_user():
    return {"id": _ADMIN_ID}


def _admin_patches(extra: list | None = None):
    """Context manager that sets up common admin patches."""
    from contextlib import ExitStack

    stack = ExitStack()
    stack.enter_context(patch("api.deps.settings", **{"admin_user_ids": [_ADMIN_ID]}))
    if extra:
        for p in extra:
            stack.enter_context(p)
    return stack


class TestCafeNomadImport:
    def setup_method(self):
        test_app.dependency_overrides[get_current_user] = _admin_user

    def teardown_method(self):
        test_app.dependency_overrides.clear()

    def test_admin_triggers_cafenomad_import_and_receives_summary(self):
        """Admin triggers Cafe Nomad import and gets a 202 with summary."""
        mock_result = {
            "imported": 42,
            "filtered": {"invalid_url": 0, "invalid_name": 2, "known_failed": 1, "closed": 5},
            "pending_url_check": 42,
            "flagged_duplicates": 3,
            "region": "greater_taipei",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
            patch(
                "importers.cafe_nomad.fetch_and_import_cafenomad",
                new=AsyncMock(return_value=mock_result),
            ),
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/cafe-nomad",
                json={"region": "greater_taipei"},
            )

        assert response.status_code == 202
        data = response.json()
        assert data["imported"] == 42
        assert data["region"] == "greater_taipei"
        assert "filtered" in data

    def test_import_cafe_nomad_unknown_region_returns_400(self):
        """Unknown region name returns 400."""
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/cafe-nomad",
                json={"region": "mars"},
            )
        assert response.status_code == 400

    def test_import_cafe_nomad_api_down_returns_502(self):
        """When Cafe Nomad API is down, returns 502."""
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
            patch(
                "importers.cafe_nomad.fetch_and_import_cafenomad",
                new=AsyncMock(side_effect=Exception("Connection refused")),
            ),
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/cafe-nomad",
                json={"region": "greater_taipei"},
            )
        assert response.status_code == 502

    def test_non_admin_cannot_import(self):
        """Non-admin user cannot trigger import."""
        test_app.dependency_overrides[get_current_user] = lambda: {"id": "regular-user"}
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/shops/import/cafe-nomad",
                    json={"region": "greater_taipei"},
                )
            assert response.status_code == 403
        finally:
            test_app.dependency_overrides[get_current_user] = _admin_user


class TestGoogleTakeoutImport:
    def setup_method(self):
        test_app.dependency_overrides[get_current_user] = _admin_user

    def teardown_method(self):
        test_app.dependency_overrides.clear()

    def _valid_geojson(self) -> bytes:
        return json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": {"coordinates": [121.565, 25.033]},
                        "properties": {
                            "Title": "慢靜岸咖啡",
                            "Google Maps URL": "https://maps.google.com/?cid=12345678901234567",
                            "Location": {"Address": "台北市大安區仁愛路四段300巷12號"},
                        },
                    }
                ],
            }
        ).encode()

    def test_import_google_takeout_returns_202_with_summary(self):
        """Admin uploads a valid GeoJSON and gets a 202 with summary."""
        mock_result = {
            "imported": 1,
            "filtered": {"invalid_url": 0, "invalid_name": 0, "known_failed": 0, "closed": 0},
            "pending_url_check": 1,
            "flagged_duplicates": 0,
            "region": "greater_taipei",
        }
        mock_db = MagicMock()
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
            patch(
                "importers.google_takeout.import_takeout_to_queue",
                new=AsyncMock(return_value=mock_result),
            ),
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/google-takeout",
                files={
                    "file": (
                        "saved_places.json",
                        BytesIO(self._valid_geojson()),
                        "application/json",
                    )
                },  # noqa: E501
                data={"region": "greater_taipei"},
            )

        assert response.status_code == 202
        data = response.json()
        assert data["imported"] == 1

    def test_invalid_json_returns_422(self):
        """Malformed file content returns 422."""
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/google-takeout",
                files={"file": ("bad.json", BytesIO(b"not valid json"), "application/json")},
                data={"region": "greater_taipei"},
            )
        assert response.status_code == 422

    def test_non_feature_collection_returns_422(self):
        """GeoJSON without FeatureCollection type returns 422."""
        bad_geojson = json.dumps({"type": "Feature", "geometry": {}}).encode()
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/google-takeout",
                files={"file": ("bad.json", BytesIO(bad_geojson), "application/json")},
                data={"region": "greater_taipei"},
            )
        assert response.status_code == 422

    def test_unknown_region_returns_400(self):
        """Unknown region returns 400."""
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/import/google-takeout",
                files={"file": ("data.json", BytesIO(self._valid_geojson()), "application/json")},
                data={"region": "narnia"},
            )
        assert response.status_code == 400


class TestBulkApprove:
    def setup_method(self):
        test_app.dependency_overrides[get_current_user] = _admin_user

    def teardown_method(self):
        test_app.dependency_overrides.clear()

    def test_bulk_approve_transitions_shops_and_queues_jobs(self):
        """Approved shops transition to pending and a single SCRAPE_BATCH job is queued."""
        shop_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
        maps_url = "https://maps.google.com/?cid=11111111111111111"
        mock_db = MagicMock()
        # Batch SELECT: .select().in_().eq().execute() returns eligible shops with URLs
        mock_db.table.return_value.select.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[{"id": shop_id, "google_maps_url": maps_url}]
        )
        # Batch UPDATE returns updated rows (for approved count)
        mock_db.table.return_value.update.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[{"id": shop_id}]
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "c3d4e5f6-a7b8-9012-cdef-012345678901"}]
        )

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/bulk-approve",
                json={"shop_ids": [shop_id]},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["approved"] == 1
        assert data["queued"] == 1

        # Verify enqueued job is SCRAPE_BATCH with correct shops payload
        job_inserts = [
            c.args[0]
            for c in mock_db.table.return_value.insert.call_args_list
            if isinstance(c.args[0], dict) and "job_type" in c.args[0]
        ]
        assert job_inserts, "Expected a job_queue insert"
        assert job_inserts[0]["job_type"] == "scrape_batch"
        assert any(s["shop_id"] == shop_id for s in job_inserts[0]["payload"]["shops"])

    def test_bulk_approve_exceeds_50_returns_400(self):
        """Batch larger than 50 returns 400."""
        mock_db = MagicMock()
        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/bulk-approve",
                json={"shop_ids": [f"shop-{i}" for i in range(51)]},
            )
        assert response.status_code == 400

    def test_bulk_approve_without_ids_approves_all_pending_review_shops(self):
        """Bulk approve without shop_ids approves all pending_review shops."""
        shop_id_1 = "d4e5f6a7-b8c9-0123-defa-234567890123"
        shop_id_2 = "e5f6a7b8-c9d0-1234-efab-345678901234"
        mock_db = MagicMock()
        # List all pending_review shops: .select().eq().limit().execute()
        mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = (  # noqa: E501
            MagicMock(data=[{"id": shop_id_1}, {"id": shop_id_2}])
        )
        # Batch SELECT with URLs: .select().in_().eq().execute()
        mock_db.table.return_value.select.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[
                {"id": shop_id_1, "google_maps_url": "https://maps.google.com/?cid=11111111111111111"},
                {"id": shop_id_2, "google_maps_url": "https://maps.google.com/?cid=22222222222222222"},
            ]
        )
        # Batch UPDATE returns updated rows
        mock_db.table.return_value.update.return_value.in_.return_value.eq.return_value.execute.return_value = MagicMock(  # noqa: E501
            data=[{"id": shop_id_1}, {"id": shop_id_2}]
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
            data=[{"id": "f6a7b8c9-d0e1-2345-fabc-456789012345"}]
        )

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                "/admin/shops/bulk-approve",
                json={},
            )
        assert response.status_code == 200
        assert response.json()["approved"] == 2

    def test_bulk_approve_empty_list_returns_zeros(self):
        """Bulk approve with no matching shops returns zeros."""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value = (  # noqa: E501
            MagicMock(data=[])
        )

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/shops/bulk-approve", json={})
        assert response.status_code == 200
        assert response.json() == {"approved": 0, "queued": 0}


class TestCheckUrls:
    def setup_method(self):
        test_app.dependency_overrides[get_current_user] = _admin_user

    def teardown_method(self):
        test_app.dependency_overrides.clear()

    def test_admin_triggers_url_check_and_sees_shops_queued_for_validation(self):
        """Triggering URL check returns 202 with count of shops queued for checking."""
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(count=15)
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[])

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
            patch("workers.handlers.check_urls.check_urls_for_region", new=AsyncMock()),
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post("/admin/shops/import/check-urls", json={})

        assert response.status_code == 202
        assert response.json()["checking"] == 15
