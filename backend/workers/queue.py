from datetime import UTC, datetime, timedelta
from typing import Any, cast

from supabase import Client

from core.db import first
from models.types import Job, JobStatus, JobType


class JobQueue:
    def __init__(self, db: Client):
        self._db = db

    async def enqueue(
        self,
        job_type: JobType,
        payload: dict[str, Any],
        priority: int = 0,
        scheduled_at: datetime | None = None,
    ) -> str:
        now = datetime.now(UTC)
        response = (
            self._db.table("job_queue")
            .insert(
                {
                    "job_type": job_type.value,
                    "payload": payload,
                    "status": JobStatus.PENDING.value,
                    "priority": priority,
                    "attempts": 0,
                    "max_attempts": 3,
                    "scheduled_at": (scheduled_at or now).isoformat(),
                }
            )
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data)
        return str(first(rows, "enqueue job")["id"])

    async def enqueue_batch(
        self,
        job_type: JobType,
        payloads: list[dict[str, Any]],
        priority: int = 0,
        scheduled_at: datetime | None = None,
    ) -> list[str]:
        """Insert multiple jobs in a single DB round-trip."""
        now = datetime.now(UTC)
        records = [
            {
                "job_type": job_type.value,
                "payload": payload,
                "status": JobStatus.PENDING.value,
                "priority": priority,
                "attempts": 0,
                "max_attempts": 3,
                "scheduled_at": (scheduled_at or now).isoformat(),
            }
            for payload in payloads
        ]
        response = self._db.table("job_queue").insert(records).execute()
        rows = cast("list[dict[str, Any]]", response.data)
        return [str(row["id"]) for row in rows]

    async def claim(self, job_type: JobType | None = None) -> Job | None:
        """Calls RPC `claim_job` which atomically claims the next pending job
        using FOR UPDATE SKIP LOCKED, ordered by priority DESC, scheduled_at ASC."""
        params: dict[str, str | None] = {"p_job_type": job_type.value if job_type else None}
        response = self._db.rpc("claim_job", params).execute()

        if not response.data:
            return None
        rows = cast("list[dict[str, Any]]", response.data)
        return Job(**first(rows, "claim job"))

    async def claim_batch(self, job_type: JobType, limit: int = 1) -> list[Job]:
        response = self._db.rpc(
            "claim_jobs_batch", {"p_job_type": job_type.value, "p_limit": limit}
        ).execute()
        if not response.data:
            return []
        return [Job(**row) for row in cast("list[dict[str, Any]]", response.data)]

    async def complete(self, job_id: str, result: dict[str, Any] | None = None) -> None:
        self._db.table("job_queue").update(
            {
                "status": JobStatus.COMPLETED.value,
                "completed_at": datetime.now(UTC).isoformat(),
            }
        ).eq("id", job_id).execute()

    async def fail(self, job_id: str, error: str) -> None:
        response = (
            self._db.table("job_queue")
            .select("attempts, max_attempts")
            .eq("id", job_id)
            .single()
            .execute()
        )
        job_data = cast("dict[str, Any]", response.data)
        attempts = job_data.get("attempts", 0)
        max_attempts = job_data.get("max_attempts", 3)

        if attempts < max_attempts:
            backoff_seconds = 60 * (2 ** (attempts - 1))  # 60s, 120s, 240s
            scheduled_at = (datetime.now(UTC) + timedelta(seconds=backoff_seconds)).isoformat()
            self._db.table("job_queue").update(
                {
                    "status": JobStatus.PENDING.value,
                    "last_error": error,
                    "scheduled_at": scheduled_at,
                }
            ).eq("id", job_id).execute()
        else:
            self._db.table("job_queue").update(
                {
                    "status": JobStatus.FAILED.value,
                    "last_error": error,
                }
            ).eq("id", job_id).execute()
