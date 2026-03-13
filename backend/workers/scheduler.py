import asyncio
from datetime import UTC, datetime, timedelta

import sentry_sdk
import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from supabase import Client

from core.config import settings
from db.supabase_client import get_service_role_client
from models.types import Job, JobType, TaxonomyTag
from providers.email import get_email_provider
from providers.embeddings import get_embeddings_provider
from providers.llm import get_llm_provider
from providers.scraper import get_scraper_provider
from workers.handlers.account_deletion import delete_expired_accounts
from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.publish_shop import handle_publish_shop
from workers.handlers.scrape_batch import handle_scrape_batch
from workers.handlers.scrape_shop import handle_scrape_shop
from workers.handlers.staleness_sweep import handle_smart_staleness_sweep
from workers.handlers.weekly_email import handle_weekly_email
from workers.queue import JobQueue

logger = structlog.get_logger()

# Per-type concurrency tracking (safe: asyncio is single-threaded)
_in_flight: dict[JobType, int] = {jt: 0 for jt in JobType}
_backoff_until: dict[JobType, datetime] = {}

# Taxonomy cache: (tags, expires_at)
_taxonomy_cache: tuple[list[TaxonomyTag], datetime] | None = None
_TAXONOMY_TTL = timedelta(minutes=5)


def _get_cached_taxonomy(db: Client) -> list[TaxonomyTag]:
    global _taxonomy_cache
    now = datetime.now(UTC)
    if _taxonomy_cache is None or now >= _taxonomy_cache[1]:
        rows = db.table("taxonomy_tags").select("*").execute()
        tags = [TaxonomyTag(**row) for row in rows.data]  # type: ignore[arg-type]
        _taxonomy_cache = (tags, now + _TAXONOMY_TTL)
    return _taxonomy_cache[0]


def _is_rate_limit_error(e: BaseException) -> bool:
    import httpx

    try:
        import anthropic

        if isinstance(e, anthropic.RateLimitError):
            return True
    except ImportError:
        pass
    try:
        import openai

        if isinstance(e, openai.RateLimitError):
            return True
    except ImportError:
        pass
    if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
        return True
    return "rate limit" in str(e).lower()


async def _dispatch_job(job: Job, db: Client, queue: JobQueue) -> None:
    match job.job_type:
        case JobType.ENRICH_SHOP | JobType.ENRICH_MENU_PHOTO:
            taxonomy = _get_cached_taxonomy(db)
            llm = get_llm_provider(taxonomy=taxonomy)
            if job.job_type == JobType.ENRICH_SHOP:
                await handle_enrich_shop(
                    payload=job.payload,
                    db=db,
                    llm=llm,
                    queue=queue,
                )
            else:
                await handle_enrich_menu_photo(
                    payload=job.payload,
                    db=db,
                    llm=llm,
                )
        case JobType.GENERATE_EMBEDDING:
            embeddings = get_embeddings_provider()
            await handle_generate_embedding(
                payload=job.payload,
                db=db,
                embeddings=embeddings,
                queue=queue,
            )
        case JobType.STALENESS_SWEEP:
            scraper = get_scraper_provider()
            await handle_smart_staleness_sweep(db=db, scraper=scraper, queue=queue)
        case JobType.WEEKLY_EMAIL:
            email = get_email_provider()
            await handle_weekly_email(db=db, email=email)
        case JobType.SCRAPE_SHOP:
            scraper = get_scraper_provider()
            await handle_scrape_shop(
                payload=job.payload,
                db=db,
                scraper=scraper,
                queue=queue,
            )
        case JobType.SCRAPE_BATCH:
            scraper = get_scraper_provider()
            await handle_scrape_batch(
                payload=job.payload,
                db=db,
                scraper=scraper,
                queue=queue,
            )
        case JobType.PUBLISH_SHOP:
            await handle_publish_shop(
                payload=job.payload,
                db=db,
            )
        case JobType.ADMIN_DIGEST_EMAIL:
            logger.info("Admin digest email not yet implemented, skipping")
        case _:
            logger.warning("Unknown job type", job_type=job.job_type)


async def _run_job(job: Job) -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    job_type = job.job_type
    logger.info("Processing job", job_id=job.id, job_type=job_type)
    try:
        await _dispatch_job(job, db, queue)
        await queue.complete(job.id)
        logger.info("Job completed", job_id=job.id)
    except Exception as e:
        logger.error("Job failed", job_id=job.id, error=str(e))
        sentry_sdk.capture_exception(e)
        if _is_rate_limit_error(e):
            _backoff_until[job_type] = datetime.now(UTC) + timedelta(seconds=30)
            logger.warning("Rate limited, backing off", job_type=job_type, seconds=30)
        await queue.fail(job.id, error=str(e))
    finally:
        _in_flight[job_type] -= 1


async def process_job_type(job_type: JobType) -> None:
    now = datetime.now(UTC)
    backoff = _backoff_until.get(job_type)
    if backoff and now < backoff:
        return

    max_concurrency = settings.get_worker_concurrency(job_type)
    available = max_concurrency - _in_flight[job_type]
    if available <= 0:
        return

    db = get_service_role_client()
    queue = JobQueue(db=db)
    jobs = await queue.claim_batch(job_type, limit=available)
    if not jobs:
        return

    for job in jobs:
        _in_flight[job_type] += 1
        asyncio.create_task(_run_job(job))


async def run_staleness_sweep() -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.STALENESS_SWEEP, payload={})


async def run_weekly_email() -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.WEEKLY_EMAIL, payload={})


def create_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

    scheduler.add_job(
        run_staleness_sweep,
        "cron",
        hour=3,
        id="staleness_sweep",
    )
    scheduler.add_job(
        run_weekly_email,
        "cron",
        day_of_week="mon",
        hour=9,
        id="weekly_email",
    )
    scheduler.add_job(
        delete_expired_accounts,
        "cron",
        hour=4,
        id="delete_expired_accounts",
    )

    for job_type in JobType:
        scheduler.add_job(
            process_job_type,
            "interval",
            seconds=settings.worker_poll_interval_seconds,
            args=[job_type],
            id=f"process_{job_type.value}",
            max_instances=1,
        )

    return scheduler
