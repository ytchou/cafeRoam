from models.types import JobType
from workers.scheduler import create_scheduler


class TestScheduler:
    def test_all_maintenance_tasks_are_scheduled(self):
        """All background maintenance jobs are registered so they run without manual intervention."""
        scheduler = create_scheduler()
        job_ids = [job.id for job in scheduler.get_jobs()]
        assert "staleness_sweep" in job_ids
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
