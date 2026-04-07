"""TDD tests for admin import trigger routes."""

from typing import Any
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


def _make_csv(rows: list[tuple[str, str]]) -> bytes:
    """Build a UTF-8 CSV bytes object with name,google_maps_url columns."""
    lines = ["name,google_maps_url"] + [f"{name},{url}" for name, url in rows]
    return "\n".join(lines).encode("utf-8")


class TestImportManualCsv:
    """Tests for POST /admin/shops/import/manual-csv."""

    def setup_method(self):
        test_app.dependency_overrides[get_current_user] = _admin_user

    def teardown_method(self):
        test_app.dependency_overrides.clear()

    def _post_csv(self, content: bytes, mock_db: MagicMock) -> "Any":
        from io import BytesIO

        with (
            patch("api.admin_shops.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            return client.post(
                "/admin/shops/import/manual-csv",
                files={"file": ("cafes.csv", BytesIO(content), "text/csv")},
            )

    def test_admin_uploads_valid_csv_and_new_shops_are_imported(self):
        """An admin uploads a CSV with two new cafes; both are inserted and counted as imported."""
        csv_bytes = _make_csv(
            [
                ("珈琲時光", "https://maps.google.com/?cid=11111111111111111"),
                ("碳佐麻里咖啡", "https://maps.google.com/?cid=22222222222222222"),
            ]
        )
        mock_db = MagicMock()
        # No existing shops in DB
        mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}, {}])

        response = self._post_csv(csv_bytes, mock_db)

        assert response.status_code == 202
        data = response.json()
        assert data["imported"] == 2
        assert data["skipped_duplicate"] == 0
        assert data["invalid_url"] == 0
        assert data["duplicate_in_file"] == 0
        assert data["total"] == 2

    def test_admin_reuploads_same_csv_and_all_rows_are_skipped_as_duplicates(self):
        """When all CSV URLs already exist in the DB, imported=0 and skipped_duplicate matches row count."""
        csv_bytes = _make_csv(
            [
                ("珈琲時光", "https://maps.google.com/?cid=11111111111111111"),
            ]
        )
        mock_db = MagicMock()
        # URL already in DB
        mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[{"google_maps_url": "https://maps.google.com/?cid=11111111111111111"}]
        )

        response = self._post_csv(csv_bytes, mock_db)

        assert response.status_code == 202
        data = response.json()
        assert data["imported"] == 0
        assert data["skipped_duplicate"] == 1
        assert data["total"] == 1

    def test_admin_uploads_csv_with_invalid_url_rows_are_counted_but_skipped(self):
        """Rows with non-Google-Maps URLs are counted as invalid_url and not inserted."""
        csv_bytes = _make_csv(
            [
                ("不知名咖啡", "https://www.facebook.com/somecafe"),
                ("木子良咖啡", "https://maps.google.com/?cid=33333333333333333"),
            ]
        )
        mock_db = MagicMock()
        # Only one valid URL; no existing shops
        mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        response = self._post_csv(csv_bytes, mock_db)

        assert response.status_code == 202
        data = response.json()
        assert data["invalid_url"] == 1
        assert data["imported"] == 1
        assert data["total"] == 2

    def test_admin_uploads_csv_with_duplicate_urls_within_the_file(self):
        """Duplicate URLs within the same CSV are deduplicated; extras counted as duplicate_in_file."""
        url = "https://maps.google.com/?cid=44444444444444444"
        csv_bytes = _make_csv(
            [
                ("店A", url),
                ("店B", url),  # same URL — should be skipped
            ]
        )
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = MagicMock(
            data=[]
        )
        mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(data=[{}])

        response = self._post_csv(csv_bytes, mock_db)

        assert response.status_code == 202
        data = response.json()
        assert data["duplicate_in_file"] == 1
        assert data["imported"] == 1
        assert data["total"] == 2

    def test_admin_uploads_file_exceeding_10mb_limit_returns_413(self):
        """A file larger than 10 MB is rejected with HTTP 413 before any DB access."""
        oversized = b"x" * (10 * 1024 * 1024 + 1)
        mock_db = MagicMock()

        response = self._post_csv(oversized, mock_db)

        assert response.status_code == 413
        mock_db.table.assert_not_called()

    def test_admin_uploads_empty_csv_returns_zeros(self):
        """An empty CSV (header only) returns all-zero counts without error."""
        csv_bytes = b"name,google_maps_url\n"
        mock_db = MagicMock()

        response = self._post_csv(csv_bytes, mock_db)

        assert response.status_code == 202
        assert response.json() == {
            "imported": 0,
            "skipped_duplicate": 0,
            "invalid_url": 0,
            "duplicate_in_file": 0,
            "total": 0,
        }


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
