from models.types import JobType
from workers.scheduler import create_scheduler


class TestScheduler:
    def test_scheduler_creates_cron_jobs(self):
        scheduler = create_scheduler()
        job_ids = [job.id for job in scheduler.get_jobs()]
        assert "staleness_sweep" in job_ids
        assert "weekly_email" in job_ids
        assert "delete_expired_accounts" in job_ids

    def test_scheduler_creates_per_type_pollers(self):
        """Each JobType gets its own interval poller, replacing the old single process_queue."""
        scheduler = create_scheduler()
        job_ids = {job.id for job in scheduler.get_jobs()}
        for job_type in JobType:
            assert f"process_{job_type.value}" in job_ids
