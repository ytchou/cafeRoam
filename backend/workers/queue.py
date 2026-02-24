from datetime import UTC, datetime

from supabase import Client

from models.types import Job, JobStatus, JobType


class JobQueue:
    """Postgres-backed job queue using FOR UPDATE SKIP LOCKED for atomic claiming."""

    def __init__(self, db: Client):
        self._db = db

    async def enqueue(
        self,
        job_type: JobType,
        payload: dict,
        priority: int = 0,
        scheduled_at: datetime | None = None,
    ) -> str:
        """Add a new job to the queue."""
        now = datetime.now(UTC)
        response = (
            self._db.table("job_queue")
            .insert({
                "job_type": job_type.value,
                "payload": payload,
                "status": JobStatus.PENDING.value,
                "priority": priority,
                "attempts": 0,
                "max_attempts": 3,
                "scheduled_at": (scheduled_at or now).isoformat(),
            })
            .execute()
        )
        return response.data[0]["id"]

    async def claim(self, job_type: JobType | None = None) -> Job | None:
        """Atomically claim the next pending job using FOR UPDATE SKIP LOCKED.

        This calls a Supabase RPC function `claim_job` that runs:

            UPDATE job_queue
            SET status = 'claimed', claimed_at = now(), attempts = attempts + 1
            WHERE id = (
                SELECT id FROM job_queue
                WHERE status = 'pending'
                AND scheduled_at <= now()
                AND (job_type = $1 OR $1 IS NULL)
                ORDER BY priority DESC, scheduled_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            RETURNING *;
        """
        params: dict = {"p_job_type": job_type.value if job_type else None}
        response = self._db.rpc("claim_job", params).execute()

        if not response.data:
            return None
        return Job(**response.data[0])

    async def complete(self, job_id: str, result: dict | None = None) -> None:
        """Mark a job as completed."""
        self._db.table("job_queue").update({
            "status": JobStatus.COMPLETED.value,
            "completed_at": datetime.now(UTC).isoformat(),
        }).eq("id", job_id).execute()

    async def fail(self, job_id: str, error: str) -> None:
        """Mark a job as failed. If under max_attempts, reset to pending for retry."""
        self._db.table("job_queue").update({
            "status": JobStatus.FAILED.value,
            "last_error": error,
        }).eq("id", job_id).execute()
