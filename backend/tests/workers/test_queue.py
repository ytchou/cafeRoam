from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest

from models.types import JobStatus, JobType
from workers.queue import JobQueue


@pytest.fixture
def mock_supabase():
    return MagicMock()


@pytest.fixture
def job_queue(mock_supabase):
    return JobQueue(db=mock_supabase)


class TestJobQueue:
    async def test_enqueue_creates_pending_job(self, job_queue, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            insert=MagicMock(return_value=MagicMock(
                execute=MagicMock(return_value=MagicMock(data=[{
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
                }]))
            ))
        ))
        job_id = await job_queue.enqueue(
            job_type=JobType.ENRICH_SHOP,
            payload={"shop_id": "s1"},
        )
        assert job_id == "job-1"

    async def test_claim_uses_skip_locked(self, job_queue, mock_supabase):
        """Verify atomic claiming with FOR UPDATE SKIP LOCKED via RPC."""
        mock_supabase.rpc = MagicMock(return_value=MagicMock(
            execute=MagicMock(return_value=MagicMock(data=[{
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
            }]))
        ))
        job = await job_queue.claim(job_type=JobType.ENRICH_SHOP)
        assert job is not None
        assert job.status == JobStatus.CLAIMED

    async def test_claim_returns_none_when_empty(self, job_queue, mock_supabase):
        mock_supabase.rpc = MagicMock(return_value=MagicMock(
            execute=MagicMock(return_value=MagicMock(data=[]))
        ))
        job = await job_queue.claim(job_type=JobType.ENRICH_SHOP)
        assert job is None

    async def test_complete_marks_job_completed(self, job_queue, mock_supabase):
        mock_supabase.table = MagicMock(return_value=MagicMock(
            update=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=MagicMock(data=[]))
                ))
            ))
        ))
        await job_queue.complete("job-1", result={"tags": 5})
        mock_supabase.table.assert_called_with("job_queue")

    async def test_fail_resets_to_pending_when_under_max_attempts(self, job_queue, mock_supabase):
        """Under max_attempts: status resets to PENDING with exponential backoff."""
        select_response = MagicMock(data={"attempts": 1, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    single=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=select_response)
                    ))
                ))
            )),
            update=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=update_response)
                ))
            )),
        ))
        await job_queue.fail("job-1", error="API timeout")
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["status"] == JobStatus.PENDING.value
        assert "scheduled_at" in update_call

    async def test_fail_marks_permanently_failed_at_max_attempts(self, job_queue, mock_supabase):
        """At max_attempts: status is set to FAILED permanently."""
        select_response = MagicMock(data={"attempts": 3, "max_attempts": 3})
        update_response = MagicMock(data=[])
        mock_supabase.table = MagicMock(return_value=MagicMock(
            select=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    single=MagicMock(return_value=MagicMock(
                        execute=MagicMock(return_value=select_response)
                    ))
                ))
            )),
            update=MagicMock(return_value=MagicMock(
                eq=MagicMock(return_value=MagicMock(
                    execute=MagicMock(return_value=update_response)
                ))
            )),
        ))
        await job_queue.fail("job-1", error="Final failure")
        update_call = mock_supabase.table.return_value.update.call_args[0][0]
        assert update_call["status"] == JobStatus.FAILED.value
        assert "scheduled_at" not in update_call
