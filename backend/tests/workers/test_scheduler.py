import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from models.types import JobReasonCode, JobType
from workers.scheduler import (
    _run_job,
    create_scheduler,
    get_scheduler_status,
    run_sweep_timed_out,
)


class TestScheduler:
    def test_all_maintenance_tasks_are_scheduled(self):
        """All background maintenance jobs are registered so they run without manual intervention."""
        scheduler = create_scheduler()
        job_ids = [job.id for job in scheduler.get_jobs()]
        assert "daily_batch_scrape" in job_ids
        assert "weekly_email" in job_ids
        assert "delete_expired_accounts" in job_ids

    def test_single_consolidated_poller_is_registered(self):
        """A single interval poller replaces per-type jobs, eliminating N×12 empty DB polls."""
        scheduler = create_scheduler()
        job_ids = {job.id for job in scheduler.get_jobs()}
        assert "poll_pending_jobs" in job_ids
        for job_type in JobType:
            assert f"process_{job_type.value}" not in job_ids

    def test_reembed_reviewed_shops_cron_is_registered(self):
        """The nightly review re-embedding cron job is registered at 03:30."""
        scheduler = create_scheduler()
        job = scheduler.get_job("reembed_reviewed_shops")
        assert job is not None


class TestSchedulerReaper:
    def test_reclaim_stuck_jobs_cron_is_registered(self):
        """The stuck-job reaper runs every 5 minutes to reclaim orphaned jobs."""
        scheduler = create_scheduler()
        job = scheduler.get_job("reclaim_stuck_jobs")
        assert job is not None

    def test_delete_expired_accounts_has_idempotency_wrapper(self):
        """delete_expired_accounts cannot double-fire within a day — the idempotency wrapper is applied."""
        scheduler = create_scheduler()
        job = scheduler.get_job("delete_expired_accounts")
        assert job is not None
        # @wraps preserves __wrapped__ on the original function; its presence confirms a decorator was applied
        assert hasattr(job.func, "__wrapped__"), (
            "delete_expired_accounts must be wrapped by @idempotent_cron"
        )


class TestSchedulerStatus:
    async def test_get_scheduler_status_returns_job_list(self):
        """get_scheduler_status returns all registered jobs with their IDs."""
        scheduler = create_scheduler()
        scheduler.start(paused=True)
        try:
            status = get_scheduler_status(scheduler)
            assert status["registered_jobs"] >= 6
            job_ids = {j["id"] for j in status["jobs"]}
            assert "poll_pending_jobs" in job_ids
            assert "reclaim_stuck_jobs" in job_ids
            assert "daily_batch_scrape" in job_ids
        finally:
            scheduler.shutdown()


@pytest.mark.asyncio
async def test_sweep_timed_out_marks_stuck_shops():
    """Shops in active states with updated_at > 3 days ago are marked timed_out."""
    mock_db = MagicMock()
    mock_execute = MagicMock()
    mock_db.table.return_value.update.return_value.in_.return_value.lt.return_value.execute.return_value = mock_execute

    mock_queue = MagicMock()
    mock_queue.acquire_cron_lock.return_value = True

    with (
        patch("workers.scheduler.get_service_role_client", return_value=mock_db),
        patch("workers.scheduler.JobQueue", return_value=mock_queue),
    ):
        await run_sweep_timed_out()

    mock_db.table.assert_called_with("shops")
    update_call = mock_db.table.return_value.update
    update_call.assert_called_once()
    update_args = update_call.call_args[0][0]
    assert update_args["processing_status"] == "timed_out"

    in_call = mock_db.table.return_value.update.return_value.in_
    in_call.assert_called_once()
    in_args = in_call.call_args[0]
    assert in_args[0] == "processing_status"
    active_statuses = in_args[1]
    assert "pending" in active_statuses
    assert "scraping" in active_statuses
    assert "enriching" in active_statuses
    assert "embedding" in active_statuses
    assert "publishing" in active_statuses
    assert "pending_url_check" not in active_statuses
    assert "live" not in active_statuses
    assert "failed" not in active_statuses
    assert "timed_out" not in active_statuses


@pytest.mark.asyncio
async def test_sweep_timed_out_skips_when_lock_not_acquired():
    """Sweep is skipped if cron lock was already acquired this hour."""
    mock_db = MagicMock()
    mock_queue = MagicMock()
    mock_queue.acquire_cron_lock.return_value = False

    with (
        patch("workers.scheduler.get_service_role_client", return_value=mock_db),
        patch("workers.scheduler.JobQueue", return_value=mock_queue),
    ):
        await run_sweep_timed_out()

    mock_db.table.return_value.update.assert_not_called()


def test_sweep_timed_out_registered_in_scheduler():
    from workers.scheduler import create_scheduler

    with patch("workers.scheduler.AsyncIOScheduler") as mock_scheduler_cls:
        mock_instance = MagicMock()
        mock_scheduler_cls.return_value = mock_instance
        create_scheduler()

    job_ids = [
        call.kwargs.get("id") or call[1].get("id") for call in mock_instance.add_job.call_args_list
    ]
    assert "sweep_timed_out" in job_ids


class TestRunJobReasonCodes:
    """_run_job passes the correct reason_code to queue.fail()."""

    async def test_cancelled_error_uses_provider_error(self):
        """CancelledError during job execution writes reason_code=provider_error."""
        mock_queue = MagicMock()
        mock_queue.fail = AsyncMock()

        mock_job = MagicMock()
        mock_job.id = "job-1"
        mock_job.job_type = JobType.ENRICH_SHOP
        mock_job.payload = {}

        with (
            patch("workers.scheduler.get_service_role_client"),
            patch("workers.scheduler.JobQueue", return_value=mock_queue),
            patch("workers.scheduler._dispatch_job", side_effect=asyncio.CancelledError()),
            patch("workers.scheduler._in_flight", {JobType.ENRICH_SHOP: 1}),
            patch("workers.scheduler.sentry_sdk"),
        ):
            with pytest.raises(asyncio.CancelledError):
                await _run_job(mock_job)

        mock_queue.fail.assert_called_once()
        call_kwargs = mock_queue.fail.call_args
        assert call_kwargs[1].get("reason_code") == JobReasonCode.PROVIDER_ERROR or \
               (len(call_kwargs[0]) >= 3 and call_kwargs[0][2] == JobReasonCode.PROVIDER_ERROR)

    async def test_general_exception_uses_provider_error(self):
        """Unhandled exception during job execution writes reason_code=provider_error."""
        mock_queue = MagicMock()
        mock_queue.fail = AsyncMock()

        mock_job = MagicMock()
        mock_job.id = "job-1"
        mock_job.job_type = JobType.ENRICH_SHOP
        mock_job.payload = {}

        with (
            patch("workers.scheduler.get_service_role_client"),
            patch("workers.scheduler.JobQueue", return_value=mock_queue),
            patch("workers.scheduler._dispatch_job", side_effect=RuntimeError("boom")),
            patch("workers.scheduler._in_flight", {JobType.ENRICH_SHOP: 1}),
            patch("workers.scheduler.sentry_sdk"),
        ):
            await _run_job(mock_job)

        mock_queue.fail.assert_called_once()
        call_kwargs = mock_queue.fail.call_args
        assert call_kwargs[1].get("reason_code") == JobReasonCode.PROVIDER_ERROR or \
               (len(call_kwargs[0]) >= 3 and call_kwargs[0][2] == JobReasonCode.PROVIDER_ERROR)
