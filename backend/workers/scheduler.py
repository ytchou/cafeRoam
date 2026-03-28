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
from workers.handlers.classify_shop_photos import handle_classify_shop_photos
from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.publish_shop import handle_publish_shop
from workers.handlers.reembed_reviewed_shops import handle_reembed_reviewed_shops
from workers.handlers.scrape_batch import handle_scrape_batch
from workers.handlers.scrape_shop import handle_scrape_shop
from workers.handlers.staleness_sweep import handle_smart_staleness_sweep
from workers.handlers.summarize_reviews import handle_summarize_reviews
from workers.handlers.weekly_email import handle_weekly_email
from workers.queue import JobQueue

logger = structlog.get_logger()

# Per-type concurrency tracking (safe: asyncio is single-threaded)
_in_flight: dict[JobType, int] = {jt: 0 for jt in JobType}
_backoff_until: dict[JobType, datetime] = {}

# Strong references to in-flight tasks prevent premature GC
_tasks: set[asyncio.Task[None]] = set()

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

    if isinstance(e, httpx.HTTPStatusError) and e.response.status_code == 429:
        return True
    # Detect provider SDK rate limit errors by type + module name to avoid importing
    # SDK types into the worker layer (CLAUDE.md provider abstraction rule).
    if type(e).__name__ == "RateLimitError" and type(e).__module__.startswith(
        ("anthropic", "openai")
    ):
        return True
    return "rate limit" in str(e).lower()


def _get_job_concurrency(job_type: JobType) -> int:
    match job_type:
        case JobType.ENRICH_SHOP:
            return settings.worker_concurrency_enrich
        case JobType.GENERATE_EMBEDDING:
            return settings.worker_concurrency_embed
        case JobType.PUBLISH_SHOP:
            return settings.worker_concurrency_publish
        case JobType.SCRAPE_BATCH | JobType.SCRAPE_SHOP:
            return settings.worker_concurrency_scrape
        case _:
            return settings.worker_concurrency_default


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
                    queue=queue,
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
        case JobType.REEMBED_REVIEWED_SHOPS:
            await handle_reembed_reviewed_shops(db=db, queue=queue)
        case JobType.CLASSIFY_SHOP_PHOTOS:
            llm = get_llm_provider()
            await handle_classify_shop_photos(
                payload=job.payload,
                db=db,
                llm=llm,
                queue=queue,
            )
        case JobType.SUMMARIZE_REVIEWS:
            llm = get_llm_provider()
            await handle_summarize_reviews(
                payload=job.payload,
                db=db,
                llm=llm,
                queue=queue,
            )
        case _:
            logger.warning("Unknown job type", job_type=job.job_type)


async def _run_job(job: Job) -> None:
    job_type = job.job_type
    logger.info("Processing job", job_id=job.id, job_type=job_type)
    queue: JobQueue | None = None
    try:
        db = get_service_role_client()
        queue = JobQueue(db=db)
        await _dispatch_job(job, db, queue)
        await queue.complete(job.id)
        logger.info("Job completed", job_id=job.id)
    except asyncio.CancelledError:
        logger.warning("Job cancelled during shutdown", job_id=job.id)
        if queue is not None:
            await queue.fail(job.id, error="Job cancelled during shutdown")
        raise
    except Exception as e:
        logger.error("Job failed", job_id=job.id, error=str(e))
        sentry_sdk.capture_exception(e)
        if _is_rate_limit_error(e):
            _backoff_until[job_type] = datetime.now(UTC) + timedelta(seconds=30)
            logger.warning("Rate limited, backing off", job_type=job_type, seconds=30)
        if queue is not None:
            await queue.fail(job.id, error=str(e))
    finally:
        _in_flight[job_type] -= 1


async def process_job_type(job_type: JobType) -> None:
    now = datetime.now(UTC)
    backoff = _backoff_until.get(job_type)
    if backoff and now < backoff:
        return

    max_concurrency = _get_job_concurrency(job_type)
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
        task = asyncio.create_task(_run_job(job))
        _tasks.add(task)
        task.add_done_callback(_tasks.discard)


async def run_staleness_sweep() -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.STALENESS_SWEEP, payload={})


async def run_weekly_email() -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.WEEKLY_EMAIL, payload={})


async def run_reembed_reviewed_shops() -> None:
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.REEMBED_REVIEWED_SHOPS, payload={})


async def poll_pending_job_types() -> None:
    """Single-poll loop: one DB query to find pending types, then dispatch each."""
    db = get_service_role_client()
    queue = JobQueue(db=db)
    pending_types = await queue.get_pending_job_types()
    for job_type in pending_types:
        await process_job_type(job_type)


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
    scheduler.add_job(
        run_reembed_reviewed_shops,
        "cron",
        hour=3,
        minute=30,  # offset from staleness_sweep at 03:00
        id="reembed_reviewed_shops",
    )

    scheduler.add_job(
        poll_pending_job_types,
        "interval",
        seconds=settings.worker_poll_interval_seconds,
        id="poll_pending_jobs",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=settings.worker_poll_interval_seconds,
    )

    return scheduler
