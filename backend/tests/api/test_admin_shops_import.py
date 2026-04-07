"""TDD tests for admin import trigger routes."""

from unittest.mock import MagicMock, patch

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
                {
                    "id": shop_id_1,
                    "google_maps_url": "https://maps.google.com/?cid=11111111111111111",
                },
                {
                    "id": shop_id_2,
                    "google_maps_url": "https://maps.google.com/?cid=22222222222222222",
                },
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
