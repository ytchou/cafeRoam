from __future__ import annotations
import uuid
from typing import Any


def log_job_event(
    db: Any,
    job_id: str | uuid.UUID,
    level: str,
    message: str,
    **context: Any,
) -> None:
    """Insert a milestone log row for a job. Swallows all errors — must not break callers."""
    try:
        (
            db.table("job_logs")
            .insert({
                "job_id": str(job_id),
                "level": level,
                "message": message,
                "context": context or {},
            })
            .execute()
        )
    except Exception:
        pass
