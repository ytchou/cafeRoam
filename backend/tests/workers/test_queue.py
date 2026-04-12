from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from models.types import JobReasonCode, JobStatus, JobType
from workers.queue import JobQueue


@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def job_queue(mock_supabase):
    return JobQueue(db=mock_supabase)


class TestJobQueue:
    async def test_enqueue_creates_pending_job(self, job_queue, mock_supabase):
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                insert=MagicMock(
                    return_value=MagicMock(
                        execute=MagicMock(
                            return_value=MagicMock(
                                data=[
                                    {
                                        "id": "job-1",
                                        "job_type": "enrich_shop",
                                        "payload": {"shop_id": "s1"},
                                        "status": "pending",
                                        "priority": 0,
                                        "attempts": 0,
                                        "max_attempts": 3,
                                        "last_error": None,
                                        "scheduled_at": datetime.now(UTC).isoformat(),
                                        "claimed_at": None,
                                        "completed_at": None,
                                        "created_at": datetime.now(UTC).isoformat(),
                                    }
                                ]
                            )
                        )
                    )
                )
            )
        )
        job_id = await job_queue.enqueue(
            job_type=JobType.ENRICH_SHOP,
            payload={"shop_id": "s1"},
        )
        assert job_id == "job-1"

    async def test_claim_uses_skip_locked(self, job_queue, mock_supabase):
        """Verify atomic claiming with FOR UPDATE SKIP LOCKED via RPC."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(
                    return_value=MagicMock(
                        data=[
                            {
                                "id": "job-1",
                                "job_type": "enrich_shop",
                                "payload": {"shop_id": "s1"},
                                "status": "claimed",
                                "priority": 0,
                                "attempts": 1,
                                "max_attempts": 3,
                                "last_error": None,
                                "scheduled_at": datetime.now(UTC).isoformat(),
                                "claimed_at": datetime.now(UTC).isoformat(),
                                "completed_at": None,
                                "created_at": datetime.now(UTC).isoformat(),
                            }
                        ]
                    )
                )
            )
        )
        job = await job_queue.claim(job_type=JobType.ENRICH_SHOP)
        assert job is not None
        assert job.status == JobStatus.CLAIMED

    async def test_claim_returns_none_when_empty(self, job_queue, mock_supabase):
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        job = await job_queue.claim(job_type=JobType.ENRICH_SHOP)
        assert job is None

    async def test_complete_marks_job_completed(self, job_queue, mock_supabase):
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                execute=MagicMock(return_value=MagicMock(data=[]))
                            )
                        )
                    )
                )
            )
        )
        await job_queue.complete("job-1", result={"tags": 5})
        mock_supabase.table.assert_called_with("job_queue")

    async def test_fail_resets_to_pending_when_under_max_attempts(self, job_queue, mock_supabase):
        """Under max_attempts: status resets to PENDING with exponential backoff."""
        select_response = MagicMock(data={"attempts": 1, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=select_response)
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(execute=MagicMock(return_value=update_response))
                        )
                    )
                ),
            )
        )
        await job_queue.fail(
            "job-1",
            error="API timeout",
            reason_code=JobReasonCode.PROVIDER_ERROR,
        )
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["status"] == JobStatus.PENDING.value
        assert "scheduled_at" in update_call

    async def test_claim_batch_returns_jobs_up_to_limit(self, job_queue, mock_supabase):
        """claim_batch calls claim_jobs_batch RPC and returns a list of claimed jobs."""
        now = datetime.now(UTC).isoformat()
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(
                    return_value=MagicMock(
                        data=[
                            {
                                "id": "job-1",
                                "job_type": "publish_shop",
                                "payload": {"shop_id": "s1"},
                                "status": "claimed",
                                "priority": 0,
                                "attempts": 1,
                                "max_attempts": 3,
                                "last_error": None,
                                "scheduled_at": now,
                                "claimed_at": now,
                                "completed_at": None,
                                "created_at": now,
                            },
                            {
                                "id": "job-2",
                                "job_type": "publish_shop",
                                "payload": {"shop_id": "s2"},
                                "status": "claimed",
                                "priority": 0,
                                "attempts": 1,
                                "max_attempts": 3,
                                "last_error": None,
                                "scheduled_at": now,
                                "claimed_at": now,
                                "completed_at": None,
                                "created_at": now,
                            },
                        ]
                    )
                )
            )
        )
        jobs = await job_queue.claim_batch(JobType.PUBLISH_SHOP, limit=5)
        assert len(jobs) == 2
        assert all(j.status == JobStatus.CLAIMED for j in jobs)
        mock_supabase.rpc.assert_called_once_with(
            "claim_jobs_batch", {"p_job_type": "publish_shop", "p_limit": 5}
        )

    async def test_claim_batch_returns_empty_when_no_jobs(self, job_queue, mock_supabase):
        """claim_batch returns an empty list when no pending jobs exist."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        jobs = await job_queue.claim_batch(JobType.PUBLISH_SHOP, limit=5)
        assert jobs == []

    async def test_get_pending_job_types_returns_ready_types(self, job_queue, mock_supabase):
        """get_pending_job_types returns job types from the get_pending_job_types RPC."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(
                execute=MagicMock(
                    return_value=MagicMock(
                        data=[
                            {"job_type": "enrich_shop"},
                            {"job_type": "generate_embedding"},
                        ]
                    )
                )
            )
        )
        result = await job_queue.get_pending_job_types()
        assert len(result) == 2
        assert JobType.ENRICH_SHOP in result
        assert JobType.GENERATE_EMBEDDING in result
        mock_supabase.rpc.assert_called_once_with("get_pending_job_types", {})

    async def test_get_pending_job_types_returns_empty_when_queue_is_idle(
        self, job_queue, mock_supabase
    ):
        """get_pending_job_types returns an empty list when no jobs are ready."""
        mock_supabase.rpc = MagicMock(
            return_value=MagicMock(execute=MagicMock(return_value=MagicMock(data=[])))
        )
        result = await job_queue.get_pending_job_types()
        assert result == []

    async def test_fail_marks_permanently_failed_at_max_attempts(self, job_queue, mock_supabase):
        """At max_attempts: status is set to FAILED permanently."""
        select_response = MagicMock(data={"attempts": 3, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=select_response)
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(execute=MagicMock(return_value=update_response))
                        )
                    )
                ),
            )
        )
        await job_queue.fail(
            "job-1",
            error="Final failure",
            reason_code=JobReasonCode.PROVIDER_ERROR,
        )
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["status"] == JobStatus.FAILED.value
        assert "scheduled_at" not in update_call


def test_acquire_cron_lock_hour_window():
    """Hour window truncates to start of current hour."""

    mock_db = MagicMock()
    mock_db.table.return_value.upsert.return_value.execute.return_value.data = [
        {"job_name": "test_job", "window_start": "2026-04-07T10:00:00+00:00"}
    ]
    queue = JobQueue(db=mock_db)

    result = queue.acquire_cron_lock("test_job", window="hour")

    assert result is True
    call_args = mock_db.table.return_value.upsert.call_args
    upsert_data = call_args[0][0]
    window_start = datetime.fromisoformat(upsert_data["window_start"])
    assert window_start.minute == 0
    assert window_start.second == 0
    assert window_start.microsecond == 0


class TestQueueFailReasonCode:
    """queue.fail() writes reason_code to job_queue."""

    async def test_fail_retry_eligible_writes_reason_code(self, job_queue, mock_supabase):
        """Given a job with attempts < max_attempts, fail() writes reason_code and retries."""
        select_response = MagicMock(data={"attempts": 1, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=select_response)
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(execute=MagicMock(return_value=update_response))
                        )
                    )
                ),
            )
        )

        await job_queue.fail("job-1", "some error", JobReasonCode.PROVIDER_ERROR)

        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["reason_code"] == "provider_error"
        assert update_call["status"] == "pending"

    async def test_fail_exhausted_writes_reason_code_and_failed_at(self, job_queue, mock_supabase):
        """Given a job at max_attempts, fail() writes reason_code + failed_at and sets failed."""
        select_response = MagicMock(data={"attempts": 3, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(
            return_value=MagicMock(
                select=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(
                                single=MagicMock(
                                    return_value=MagicMock(
                                        execute=MagicMock(return_value=select_response)
                                    )
                                )
                            )
                        )
                    )
                ),
                update=MagicMock(
                    return_value=MagicMock(
                        eq=MagicMock(
                            return_value=MagicMock(execute=MagicMock(return_value=update_response))
                        )
                    )
                ),
            )
        )

        await job_queue.fail("job-1", "final error", JobReasonCode.RETRY_EXHAUSTED)

        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["reason_code"] == "retry_exhausted"
        assert update_call["status"] == "failed"
        assert "failed_at" in update_call

    async def test_fail_requires_reason_code(self, job_queue):
        """queue.fail() raises TypeError if reason_code is not provided."""
        with pytest.raises(TypeError):
            await job_queue.fail("job-1", "error")  # missing reason_code
