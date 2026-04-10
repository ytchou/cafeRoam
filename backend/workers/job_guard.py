import logging

from workers.queue import JobQueue

logger = logging.getLogger(__name__)


async def check_job_still_claimed(queue: JobQueue, job_id: str) -> bool:
    status = await queue.get_status(job_id)
    return status == "claimed"
