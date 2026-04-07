from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api.deps import get_current_user
from main import app

client = TestClient(app)

_ADMIN_ID = "a7f3c2e1-4b58-4d9a-8c6e-123456789abc"
_REGULAR_USER_ID = "a1b2c3d4-0000-0000-0000-000000000002"
_SHOP_1_ID = "c3d4e5f6-0001-0001-0001-000000000001"
_SHOP_2_ID = "c3d4e5f6-0002-0002-0002-000000000002"
_SUB_1_ID = "b2c3d4e5-0001-0001-0001-000000000001"
_SUB_2_ID = "b2c3d4e5-0002-0002-0002-000000000002"
_JOB_1_ID = "d4e5f6a7-0001-0001-0001-000000000001"
_JOB_2_ID = "d4e5f6a7-0002-0002-0002-000000000002"
_JOB_10_ID = "d4e5f6a7-0010-0010-0010-000000000010"
_JOB_11_ID = "d4e5f6a7-0011-0011-0011-000000000011"
_MISSING_JOB_ID = "00000000-0000-0000-0000-000000000001"
_MISSING_SUB_ID = "00000000-0000-0000-0000-000000000002"


def _admin_user():
    return {"id": _ADMIN_ID}


def test_unauthenticated_user_cannot_access_pipeline_overview():
    response = client.get("/admin/pipeline/overview")
    assert response.status_code in (401, 403)


def test_non_admin_user_is_blocked_from_pipeline_overview():
    """Non-admin users should get 403."""
    app.dependency_overrides[get_current_user] = lambda: {"id": _REGULAR_USER_ID}
    try:
        mock_db = MagicMock()
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/overview")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_admin_sees_job_counts_and_recent_submissions():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_eq = mock_db.table.return_value.select.return_value.eq.return_value
        mock_eq.execute.return_value = MagicMock(data=[], count=0)
        mock_order = mock_db.table.return_value.select.return_value.order.return_value
        mock_order.limit.return_value.execute.return_value = MagicMock(data=[])
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.get("/admin/pipeline/overview")
        assert response.status_code == 200
        data = response.json()
        assert "job_counts" in data
        assert "recent_submissions" in data
    finally:
        app.dependency_overrides.clear()


def test_retrying_failed_job_re_enqueues_it():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": _JOB_1_ID, "status": "failed"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(f"/admin/pipeline/retry/{_JOB_1_ID}")
        assert response.status_code == 200
        assert "re-queued" in response.json()["message"]
    finally:
        app.dependency_overrides.clear()


def test_admin_gets_not_found_error_when_retrying_a_job_that_does_not_exist():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(f"/admin/pipeline/retry/{_MISSING_JOB_ID}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_admin_cannot_retry_a_job_that_has_already_completed():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"id": _JOB_2_ID, "status": "completed"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(f"/admin/pipeline/retry/{_JOB_2_ID}")
        assert response.status_code == 409
    finally:
        app.dependency_overrides.clear()


def test_rejecting_submission_sets_shop_rejected():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[{"shop_id": _SHOP_1_ID, "status": "pending_review"}])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                f"/admin/pipeline/reject/{_SUB_1_ID}",
                json={"rejection_reason": "not_a_cafe"},
            )
        assert response.status_code == 200
        assert "rejected" in response.json()["message"]
        # Verify shop was set to rejected (not deleted)
        table_calls = [c.args[0] for c in mock_db.table.call_args_list]
        assert "shops" in table_calls
        mock_db.table.return_value.delete.return_value.eq.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_rejecting_nonexistent_submission_returns_404():
    app.dependency_overrides[get_current_user] = _admin_user
    try:
        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
            MagicMock(data=[])
        )
        with (
            patch("api.admin.get_service_role_client", return_value=mock_db),
            patch("api.deps.settings") as mock_settings,
        ):
            mock_settings.admin_user_ids = [_ADMIN_ID]
            response = client.post(
                f"/admin/pipeline/reject/{_MISSING_SUB_ID}",
                json={"rejection_reason": "other"},
            )
        assert response.status_code == 404
    finally:
        app.dependency_overrides.clear()


class TestAdminJobsList:
    def test_admin_can_list_all_jobs_with_pagination(self):
        """Admin can list all jobs with pagination."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            select_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "job_type": "enrich_shop", "status": "pending"}],
                count=1,
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/jobs")
            assert response.status_code == 200
            data = response.json()
            assert "jobs" in data
        finally:
            app.dependency_overrides.clear()

    def test_admin_can_filter_jobs_by_status_and_type(self):
        """Admin can filter jobs by status and job_type."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            eq2_rv = select_rv.eq.return_value.eq.return_value
            eq2_rv.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[],
                count=0,
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/jobs?status=failed&job_type=enrich_shop")
            assert response.status_code == 200
        finally:
            app.dependency_overrides.clear()


class TestAdminSubmissions:
    def test_admin_can_list_all_submissions(self):
        """Admin can list all shop submissions."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            select_rv.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[
                    {"id": _SUB_1_ID, "status": "pending", "shop_id": _SHOP_1_ID},
                    {"id": _SUB_2_ID, "status": "processing", "shop_id": _SHOP_2_ID},
                ]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/submissions")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
        finally:
            app.dependency_overrides.clear()

    def test_admin_can_filter_submissions_by_status(self):
        """Admin can filter submissions by status."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            # When status filter is applied, eq() is called after limit()
            select_rv.order.return_value.limit.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _SUB_1_ID, "status": "pending", "shop_id": _SHOP_1_ID}])
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/submissions?status=pending")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
        finally:
            app.dependency_overrides.clear()


class TestAdminDeadLetter:
    def test_admin_sees_failed_jobs_in_dead_letter_queue(self):
        """Admin can view failed and dead_letter jobs for investigation."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            select_rv = mock_db.table.return_value.select.return_value
            select_rv.in_.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[
                    {"id": _JOB_10_ID, "status": "failed", "job_type": "enrich_shop"},
                    {"id": _JOB_11_ID, "status": "dead_letter", "job_type": "scrape_batch"},
                ]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/dead-letter")
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 2
        finally:
            app.dependency_overrides.clear()


class TestAdminApproveSubmission:
    def test_admin_can_approve_a_pending_submission(self):
        """Admin approving a pending submission marks it live."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # First call: select to fetch submission status + shop_id
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {
                            "id": _SUB_1_ID,
                            "status": "pending",
                            "shop_id": _SHOP_1_ID,
                            "submitted_by": None,
                        }
                    ]
                )
            )
            # Second call: submission conditional update (TOCTOU guard via .in_())
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _SUB_1_ID, "status": "live"}]
            )
            # Third call: shop update with .select("name") to fetch name in same round-trip
            mock_db.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"name": "Test Café"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/approve/{_SUB_1_ID}")
            assert response.status_code == 200
            assert "approved" in response.json()["message"]
        finally:
            app.dependency_overrides.clear()

    def test_approving_nonexistent_submission_returns_404(self):
        """Approving a submission that does not exist returns 404."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[])
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/approve/{_MISSING_SUB_ID}")
            assert response.status_code == 404
        finally:
            app.dependency_overrides.clear()

    def test_approving_already_live_submission_returns_409(self):
        """Approving a submission that is already live returns 409."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _SUB_2_ID, "status": "live"}])
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/approve/{_SUB_2_ID}")
            assert response.status_code == 409
        finally:
            app.dependency_overrides.clear()


class TestBulkApproveSubmissions:
    def test_approves_pending_submissions(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # GET submission returns pending submission with shop_id
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1", "status": "pending", "shop_id": "shop-1", "submitted_by": None}]
            )
            # UPDATE submission succeeds
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}]
            )
            # UPDATE shop succeeds
            mock_db.table.return_value.update.return_value.eq.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"name": "Test Cafe"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/approve-bulk",
                    json={"submission_ids": ["sub-1"]},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["approved"] == 1
            assert data["skipped"] == 0
        finally:
            app.dependency_overrides.clear()

    def test_already_live_submissions_are_skipped(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # GET submission returns live submission
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1", "status": "live", "shop_id": "shop-1", "submitted_by": None}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/approve-bulk",
                    json={"submission_ids": ["sub-1"]},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["approved"] == 0
            assert data["skipped"] == 1
        finally:
            app.dependency_overrides.clear()

    def test_returns_400_when_more_than_50_ids(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/approve-bulk",
                    json={"submission_ids": [f"sub-{i}" for i in range(51)]},
                )
            assert response.status_code == 400
        finally:
            app.dependency_overrides.clear()


class TestBulkRejectSubmissions:
    def test_rejects_pending_submissions_with_reason(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1", "status": "pending", "shop_id": "shop-1"}]
            )
            # UPDATE submission
            mock_db.table.return_value.update.return_value.eq.return_value.not_.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}]
            )
            mock_db.rpc.return_value.execute.return_value = MagicMock(data=None)
            # UPDATE shop
            mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/reject-bulk",
                    json={"submission_ids": ["sub-1"], "rejection_reason": "not_a_cafe"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["rejected"] == 1
            assert data["skipped"] == 0
        finally:
            app.dependency_overrides.clear()

    def test_already_rejected_submissions_are_skipped(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1", "status": "rejected", "shop_id": "shop-1"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/reject-bulk",
                    json={"submission_ids": ["sub-1"], "rejection_reason": "not_a_cafe"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["rejected"] == 0
            assert data["skipped"] == 1
        finally:
            app.dependency_overrides.clear()

    def test_returns_400_when_more_than_50_ids(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            with patch("api.deps.settings") as mock_settings:
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/reject-bulk",
                    json={
                        "submission_ids": [f"sub-{i}" for i in range(51)],
                        "rejection_reason": "not_a_cafe",
                    },
                )
            assert response.status_code == 400
        finally:
            app.dependency_overrides.clear()


class TestAdminJobCancel:
    def test_admin_can_cancel_a_pending_job(self):
        """Admin can cancel a pending job."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "pending"}])
            )
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "status": "dead_letter"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel")
            assert response.status_code == 200
            assert "cancelled" in response.json()["message"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_completed_job_cannot_be_cancelled(self):
        """Completed jobs cannot be cancelled — returns 409."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "completed"}])
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel")
            assert response.status_code == 409
        finally:
            app.dependency_overrides.clear()


class TestAdminBatchListing:
    def test_admin_batch_listing_only_shows_scrape_batch_jobs(self):
        """When an admin views the batch listing, only scrape_batch jobs appear — not the legacy scrape_shop type."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "job_type": "scrape_batch",
                        "payload": {
                            "batch_id": "batch-abc-123",
                            "shops": [
                                {"shop_id": _SHOP_1_ID},
                                {"shop_id": _SHOP_2_ID},
                            ],
                        },
                        "created_at": "2026-04-06T10:00:00Z",
                    }
                ]
            )
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"id": _SHOP_1_ID, "processing_status": "live"},
                        {"id": _SHOP_2_ID, "processing_status": "pending"},
                    ]
                )
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get("/admin/pipeline/batches")
            assert response.status_code == 200
            data = response.json()
            assert "batches" in data

            all_call_args = str(mock_db.mock_calls)
            assert "scrape_shop" not in all_call_args, (
                "list_batches must not query for scrape_shop — batch-only pipeline uses scrape_batch only"
            )
        finally:
            app.dependency_overrides.clear()

    def test_admin_batch_shop_ids_excludes_legacy_scrape_shop_format(self):
        """When collecting shop IDs for a batch, only the scrape_batch payload format is used — the old scrape_shop format is ignored."""
        from api.admin import _collect_shop_ids_for_batch

        mock_db = MagicMock()
        mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[
                {
                    "payload": {
                        "batch_id": "batch-xyz-456",
                        "shops": [{"shop_id": _SHOP_1_ID}],
                    }
                }
            ]
        )

        result = _collect_shop_ids_for_batch("batch-xyz-456", mock_db)
        assert result == [_SHOP_1_ID]

        all_call_args = str(mock_db.mock_calls)
        assert "scrape_shop" not in all_call_args, (
            "_collect_shop_ids_for_batch must not fall back to scrape_shop — "
            "that old format is no longer supported"
        )
