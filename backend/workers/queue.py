from datetime import UTC, datetime, timedelta
from typing import Any, cast

import sentry_sdk
import structlog
from supabase import Client

from core.config import settings
from core.db import first
from models.types import Job, JobStatus, JobType

logger = structlog.get_logger()


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
        if not payloads:
            return []
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

    async def get_pending_job_types(self) -> list[JobType]:
        """Single-query discovery of job types with pending work via SELECT DISTINCT RPC."""
        response = self._db.rpc("get_pending_job_types", {}).execute()
        rows = cast("list[dict[str, Any]]", response.data or [])
        result: list[JobType] = []
        for row in rows:
            try:
                result.append(JobType(row["job_type"]))
            except ValueError:
                logger.warning("Unknown job_type in queue, skipping", job_type=row.get("job_type"))
        return result

    async def claim_batch(self, job_type: JobType, limit: int = 1) -> list[Job]:
        response = self._db.rpc(
            "claim_jobs_batch", {"p_job_type": job_type.value, "p_limit": limit}
        ).execute()
        if not response.data:
            return []
        return [Job(**row) for row in cast("list[dict[str, Any]]", response.data)]

    async def get_status(self, job_id: str) -> str | None:
        result = (
            self._db.table("job_queue").select("status").eq("id", job_id).maybe_single().execute()
        )
        if not result or not result.data:
            return None
        return cast("dict[str, Any]", result.data).get("status")

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
                    "failed_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", job_id).execute()

    async def reclaim_stuck_jobs(self) -> tuple[int, int]:
        """Reclaim jobs stuck in CLAIMED status beyond the configured timeout.
        Returns (reclaimed_count, failed_count)."""
        response = self._db.rpc(
            "reclaim_stuck_jobs",
            {"p_timeout_minutes": settings.worker_stuck_job_timeout_minutes},
        ).execute()
        empty: dict[str, int] = {"reclaimed_count": 0, "failed_count": 0}
        rows: list[dict[str, Any]] = cast("list[dict[str, Any]]", response.data or [])
        row: dict[str, Any] = first(rows, "reclaim_stuck_jobs") if rows else empty
        return (int(row["reclaimed_count"]), int(row["failed_count"]))

    def acquire_cron_lock(self, job_name: str, window: str) -> bool:
        """Attempt to acquire an idempotency lock for a cron job.
        Returns True if lock acquired (first run in this window), False if already ran."""
        now = datetime.now(UTC)
        if window == "week":
            window_start = (now - timedelta(days=now.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        elif window == "day":
            window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif window == "hour":
            window_start = now.replace(minute=0, second=0, microsecond=0)
        else:
            raise ValueError(f"Unknown cron window: {window!r}")

        try:
            response = (
                self._db.table("cron_locks")
                .upsert(
                    {"job_name": job_name, "window_start": window_start.isoformat()},
                    on_conflict="job_name,window_start",
                    ignore_duplicates=True,
                )
                .execute()
            )
            return bool(response.data)
        except Exception as exc:
            logger.warning(
                "Cron lock acquisition failed, proceeding",
                job_name=job_name,
                error=str(exc),
            )
            sentry_sdk.capture_exception(exc)
            return True

    async def cleanup_old_cron_locks(self, retention_days: int = 7) -> None:
        """Delete cron_locks older than retention period."""
        cutoff = (datetime.now(UTC) - timedelta(days=retention_days)).isoformat()
        self._db.table("cron_locks").delete().lt("created_at", cutoff).execute()

