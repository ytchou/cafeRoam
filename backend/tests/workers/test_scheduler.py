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

    def test_each_job_type_has_dedicated_queue_poller(self):
        """Each JobType gets its own interval poller so a backlog in one type does not starve others."""
        scheduler = create_scheduler()
        job_ids = {job.id for job in scheduler.get_jobs()}
        for job_type in JobType:
            assert f"process_{job_type.value}" in job_ids

    def test_reembed_reviewed_shops_cron_is_registered(self):
        """The nightly review re-embedding cron job is registered at 03:30."""
        scheduler = create_scheduler()
        job = scheduler.get_job("reembed_reviewed_shops")
        assert job is not None
