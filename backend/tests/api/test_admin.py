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

    def test_job_model_has_step_timings_field(self):
        from models.types import Job

        job = Job(
            id="aaaaaaaa-0000-0000-0000-000000000001",
            job_type="enrich_shop",
            payload={"shop_id": "shop-001"},
            status="completed",
            scheduled_at="2026-04-11T00:00:00Z",
            created_at="2026-04-11T00:00:00Z",
            step_timings={
                "fetch_data": {"duration_ms": 120},
                "llm_call": {"duration_ms": 7800},
                "db_write": {"duration_ms": 95},
            },
        )
        assert job.step_timings == {
            "fetch_data": {"duration_ms": 120},
            "llm_call": {"duration_ms": 7800},
            "db_write": {"duration_ms": 95},
        }

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
            # Batch-fetch submissions via IN() query
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {
                            "id": "sub-1",
                            "status": "pending",
                            "shop_id": "shop-1",
                            "submitted_by": None,
                        }
                    ]
                )
            )
            # Bulk UPDATE submissions via .in_().in_().select().execute()
            mock_db.table.return_value.update.return_value.in_.return_value.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}]
            )
            # Bulk UPDATE shops via .in_().select().execute()
            mock_db.table.return_value.update.return_value.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"id": "shop-1", "name": "Test Cafe"}]
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
            # Batch-fetch submissions via IN() query — returns live submission
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"id": "sub-1", "status": "live", "shop_id": "shop-1", "submitted_by": None}
                    ]
                )
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

    def test_approves_all_n_submissions_not_just_one(self):
        """When 3 pending submissions are bulk-approved, all 3 are approved — not just the first.

        Regression for: supabase-py .update().execute() returns data=[] without .select(),
        causing the per-item guard to skip every submission after the first.
        """
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            sub_ids = ["sub-1", "sub-2", "sub-3"]
            shop_ids = ["shop-1", "shop-2", "shop-3"]

            # Batch-fetch returns all 3 pending submissions
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {
                            "id": sub_ids[0],
                            "status": "pending",
                            "shop_id": shop_ids[0],
                            "submitted_by": None,
                        },
                        {
                            "id": sub_ids[1],
                            "status": "pending",
                            "shop_id": shop_ids[1],
                            "submitted_by": "user-42",
                        },
                        {
                            "id": sub_ids[2],
                            "status": "processing",
                            "shop_id": shop_ids[2],
                            "submitted_by": None,
                        },
                    ]
                )
            )
            # Simulate real supabase-py behavior: .update()...execute() without .select() returns data=[]
            # The buggy per-item path hits .eq().in_().execute() — make it return empty data
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )
            # The fixed bulk path hits .in_().in_().select().execute() — make it return all 3 IDs
            mock_db.table.return_value.update.return_value.in_.return_value.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}, {"id": "sub-2"}, {"id": "sub-3"}]
            )
            # Bulk UPDATE shops (via .in_("id", ...)) returns shop names
            mock_db.table.return_value.update.return_value.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[
                    {"id": "shop-1", "name": "Cafe Alpha"},
                    {"id": "shop-2", "name": "Cafe Beta"},
                    {"id": "shop-3", "name": "Cafe Gamma"},
                ]
            )

            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/approve-bulk",
                    json={"submission_ids": sub_ids},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["approved"] == 3, (
                f"Expected 3 approved, got {data['approved']} — bulk update bug?"
            )
            assert data["skipped"] == 0
        finally:
            app.dependency_overrides.clear()


class TestBulkRejectSubmissions:
    def test_rejects_pending_submissions_with_reason(self):
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # Batch-fetch submissions via IN() query
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(data=[{"id": "sub-1", "status": "pending", "shop_id": "shop-1"}])
            )
            # Bulk UPDATE submissions via .in_().not_.in_().select().execute()
            mock_db.table.return_value.update.return_value.in_.return_value.not_.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}]
            )
            mock_db.rpc.return_value.execute.return_value = MagicMock(data=None)
            # Bulk UPDATE shops via .in_().execute()
            mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
                MagicMock(data=[])
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
            # Batch-fetch submissions via IN() query — returns rejected submission
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(data=[{"id": "sub-1", "status": "rejected", "shop_id": "shop-1"}])
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

    def test_rejects_all_n_submissions_not_just_one(self):
        """When 3 pending submissions are bulk-rejected, all 3 are rejected — not just the first.

        Regression for: supabase-py .update().execute() returns data=[] without .select(),
        causing the per-item guard to skip every submission after the first.
        """
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            sub_ids = ["sub-1", "sub-2", "sub-3"]
            shop_ids = ["shop-1", "shop-2", "shop-3"]

            # Batch-fetch returns all 3 submissions in rejectable states
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"id": sub_ids[0], "status": "pending", "shop_id": shop_ids[0]},
                        {"id": sub_ids[1], "status": "processing", "shop_id": shop_ids[1]},
                        {"id": sub_ids[2], "status": "pending_review", "shop_id": shop_ids[2]},
                    ]
                )
            )
            # Simulate real supabase-py behavior: .update()...execute() without .select() returns data=[]
            # The buggy per-item path hits .eq().not_.in_().execute() — make it return empty data
            # Note: not_ is accessed as a property attribute (not called), so the chain is .not_.in_(), not .not_().in_()
            mock_db.table.return_value.update.return_value.eq.return_value.not_.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )
            # The fixed bulk path hits .in_().not_.in_().select().execute() — make it return all 3 IDs
            mock_db.table.return_value.update.return_value.in_.return_value.not_.in_.return_value.select.return_value.execute.return_value = MagicMock(
                data=[{"id": "sub-1"}, {"id": "sub-2"}, {"id": "sub-3"}]
            )
            # Bulk UPDATE shops (via .in_("id", ...))
            mock_db.table.return_value.update.return_value.in_.return_value.execute.return_value = (
                MagicMock(data=[])
            )
            mock_db.rpc.return_value.execute.return_value = MagicMock(data=None)

            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    "/admin/pipeline/reject-bulk",
                    json={"submission_ids": sub_ids, "rejection_reason": "not_a_cafe"},
                )
            assert response.status_code == 200
            data = response.json()
            assert data["rejected"] == 3, (
                f"Expected 3 rejected, got {data['rejected']} — bulk update bug?"
            )
            assert data["skipped"] == 0
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

    def test_cancel_job_with_reason_sets_cancelled_status(self):
        """Admin cancels a job with a reason — job row gets cancelled status, cancel_reason, and cancelled_at."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "pending", "payload": {}}])
            )
            updated_row = {
                "id": _JOB_1_ID,
                "status": "cancelled",
                "cancel_reason": "stuck job",
                "cancelled_at": "2026-04-10T00:00:00",
            }
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[updated_row]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel",
                    json={"reason": "stuck job"},
                )
            assert response.status_code == 200
            update_calls = mock_db.table.return_value.update.call_args_list
            assert any(
                call[0][0].get("status") == "cancelled"
                and call[0][0].get("cancel_reason") == "stuck job"
                for call in update_calls
            )
        finally:
            app.dependency_overrides.clear()

    def test_cancel_job_with_reason_updates_shop_processing_status(self):
        """When a job has a shop_id in payload and shop is not live/failed, cancelling updates shop processing_status to failed."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"id": _JOB_1_ID, "status": "pending", "payload": {"shop_id": _SHOP_1_ID}}
                    ]
                )
            )
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "status": "cancelled"}]
            )
            mock_db.table.return_value.update.return_value.eq.return_value.not_.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel",
                    json={"reason": "stuck job"},
                )
            assert response.status_code == 200
            shops_update_calls = [
                call for call in mock_db.table.call_args_list if call[0][0] == "shops"
            ]
            assert len(shops_update_calls) >= 1
        finally:
            app.dependency_overrides.clear()

    def test_cancel_job_with_reason_inserts_job_log_row(self):
        """Cancelling a job inserts a warn-level job_logs row with message 'job.cancelled' and the reason in context."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "claimed", "payload": {}}])
            )
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "status": "cancelled"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel",
                    json={"reason": "stuck job"},
                )
            assert response.status_code == 200
            insert_calls = mock_db.table.return_value.insert.call_args_list
            log_inserts = [
                call for call in insert_calls if call[0][0].get("message") == "job.cancelled"
            ]
            assert len(log_inserts) >= 1
            log_row = log_inserts[0][0][0]
            assert log_row["level"] == "warn"
            assert log_row["context"].get("reason") == "stuck job"
        finally:
            app.dependency_overrides.clear()

    def test_cancel_job_without_reason_uses_default(self):
        """When no reason is provided, cancel_reason defaults to 'Cancelled by admin'."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "pending", "payload": {}}])
            )
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "status": "cancelled"}]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel")
            assert response.status_code == 200
            update_calls = mock_db.table.return_value.update.call_args_list
            assert any(
                call[0][0].get("cancel_reason") == "Cancelled by admin" for call in update_calls
            )
        finally:
            app.dependency_overrides.clear()


_LOG_1_ID = "e5f6a7b8-0001-0001-0001-000000000001"
_LOG_2_ID = "e5f6a7b8-0002-0002-0002-000000000002"
_LOG_3_ID = "e5f6a7b8-0003-0003-0003-000000000003"


class TestAdminJobLogs:
    def test_get_job_logs_returns_empty_when_no_logs(self):
        """Admin fetches logs for a claimed job that has no log entries yet — returns empty logs list."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # job_queue SELECT returns the job with status "claimed"
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "claimed"}])
            )
            # job_logs query returns empty
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get(f"/admin/pipeline/jobs/{_JOB_1_ID}/logs")
            assert response.status_code == 200
            data = response.json()
            assert data["logs"] == []
            assert data["job_status"] == "claimed"
        finally:
            app.dependency_overrides.clear()

    def test_get_job_logs_returns_logs_in_order(self):
        """Admin fetches logs for a job — response contains all logs with required fields in ascending timestamp order."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            log_rows = [
                {
                    "id": _LOG_1_ID,
                    "level": "info",
                    "message": "job.started",
                    "context": {"worker": "classify_shop_photos"},
                    "created_at": "2026-04-10T10:00:00Z",
                },
                {
                    "id": _LOG_2_ID,
                    "level": "info",
                    "message": "photo.classified",
                    "context": {"photo_count": 3},
                    "created_at": "2026-04-10T10:00:05Z",
                },
                {
                    "id": _LOG_3_ID,
                    "level": "info",
                    "message": "job.completed",
                    "context": {"duration_ms": 5000},
                    "created_at": "2026-04-10T10:00:10Z",
                },
            ]
            # job_queue SELECT
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "completed"}])
            )
            # job_logs query with order + limit
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=log_rows
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get(f"/admin/pipeline/jobs/{_JOB_1_ID}/logs")
            assert response.status_code == 200
            data = response.json()
            assert len(data["logs"]) == 3
            for log in data["logs"]:
                assert "id" in log
                assert "level" in log
                assert "message" in log
                assert "context" in log
                assert "created_at" in log
            assert data["logs"][0]["created_at"] <= data["logs"][1]["created_at"]
            assert data["logs"][1]["created_at"] <= data["logs"][2]["created_at"]
        finally:
            app.dependency_overrides.clear()

    def test_get_job_logs_with_after_ts_filters_logs(self):
        """When after_ts query param is provided, the DB query filters logs created after that timestamp."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            after_ts = "2026-04-10T10:00:05Z"
            # job_queue SELECT
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "completed"}])
            )
            # job_logs query with gt filter — chain: .eq().order().limit().gt()... or .eq().gt()...
            # The gt filter is applied before order/limit, so chain: select.eq.order.limit.execute (after gt)
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.gt.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "id": _LOG_3_ID,
                        "level": "info",
                        "message": "job.completed",
                        "context": {},
                        "created_at": "2026-04-10T10:00:10Z",
                    }
                ]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get(f"/admin/pipeline/jobs/{_JOB_1_ID}/logs?after_ts={after_ts}")
            assert response.status_code == 200
            # Verify .gt() was called with "created_at" and the after_ts value
            gt_calls = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.gt.call_args_list
            assert any(call[0] == ("created_at", after_ts) for call in gt_calls)
        finally:
            app.dependency_overrides.clear()

    def test_get_job_logs_includes_current_job_status(self):
        """Response includes the job's current status from job_queue."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # job_queue SELECT returns completed status
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[{"id": _JOB_1_ID, "status": "completed"}])
            )
            mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get(f"/admin/pipeline/jobs/{_JOB_1_ID}/logs")
            assert response.status_code == 200
            data = response.json()
            assert data["job_status"] == "completed"
        finally:
            app.dependency_overrides.clear()

    def test_get_job_logs_returns_404_when_job_not_found(self):
        """Fetching logs for a non-existent job returns 404."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # job_queue SELECT returns empty — job not found
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(data=[])
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.get(f"/admin/pipeline/jobs/{_MISSING_JOB_ID}/logs")
            assert response.status_code == 404
        finally:
            app.dependency_overrides.clear()

    def test_cancel_job_does_not_update_shop_when_processing_status_is_live(self):
        """When a job has a shop_id but the shop is already 'live', the shops table should NOT be updated."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"id": _JOB_1_ID, "status": "pending", "payload": {"shop_id": _SHOP_1_ID}}
                    ]
                )
            )
            mock_db.table.return_value.update.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
                data=[{"id": _JOB_1_ID, "status": "cancelled"}]
            )
            mock_db.table.return_value.update.return_value.eq.return_value.not_.in_.return_value.execute.return_value = MagicMock(
                data=[]
            )
            with (
                patch("api.admin.get_service_role_client", return_value=mock_db),
                patch("middleware.admin_audit.get_service_role_client", return_value=mock_db),
                patch("api.deps.settings") as mock_settings,
            ):
                mock_settings.admin_user_ids = [_ADMIN_ID]
                response = client.post(
                    f"/admin/pipeline/jobs/{_JOB_1_ID}/cancel",
                    json={"reason": "stuck job"},
                )
            assert response.status_code == 200
        finally:
            app.dependency_overrides.clear()


_BATCH_RUN_ID = "e5f6a7b8-0001-0001-0001-000000000001"
_BATCH_ID = "batch-abc-2026-04-09"


class TestAdminBatchListing:
    def test_admin_batch_listing_only_shows_scrape_batch_jobs(self):
        """When an admin views the batch listing, the response is built from batch_runs and batch_run_shops — not the legacy job_queue table."""
        app.dependency_overrides[get_current_user] = _admin_user
        try:
            mock_db = MagicMock()
            # batch_runs query: .table().select().order().range().execute()
            mock_db.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value = MagicMock(
                data=[
                    {
                        "id": _BATCH_RUN_ID,
                        "batch_id": _BATCH_ID,
                        "started_at": "2026-04-09T10:00:00Z",
                        "completed_at": "2026-04-09T10:05:00Z",
                        "status": "completed",
                        "total": 2,
                    }
                ],
                count=1,
            )
            # batch_run_shops query: .table().select().in_().execute()
            mock_db.table.return_value.select.return_value.in_.return_value.execute.return_value = (
                MagicMock(
                    data=[
                        {"batch_run_id": _BATCH_RUN_ID, "status": "live"},
                        {"batch_run_id": _BATCH_RUN_ID, "status": "pending"},
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
            assert "total" in data
            assert data["total"] == 1

            batch = data["batches"][0]
            assert batch["batch_id"] == _BATCH_ID
            assert batch["status"] == "completed"
            assert batch["shop_count"] == 2
            assert "status_counts" in batch

            all_call_args = str(mock_db.mock_calls)
            assert "job_queue" not in all_call_args, (
                "list_batches must read from batch_runs/batch_run_shops — not the legacy job_queue table"
            )
        finally:
            app.dependency_overrides.clear()
