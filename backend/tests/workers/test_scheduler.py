from workers.scheduler import create_scheduler


class TestScheduler:
    def test_scheduler_creates_with_jobs(self):
        scheduler = create_scheduler()
        job_ids = [job.id for job in scheduler.get_jobs()]
        assert "staleness_sweep" in job_ids
        assert "weekly_email" in job_ids
        assert "process_queue" in job_ids
