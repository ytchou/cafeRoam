from __future__ import annotations

from typing import TYPE_CHECKING

from models.types import JobStatus

if TYPE_CHECKING:
    from workers.queue import JobQueue


async def check_job_still_claimed(queue: JobQueue, job_id: str) -> bool:
    """Return True iff the job's current status is still claimed."""
    status = await queue.get_status(job_id)
    if isinstance(status, JobStatus):
        return status == JobStatus.CLAIMED
    return status == JobStatus.CLAIMED.value
