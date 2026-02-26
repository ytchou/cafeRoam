import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from db.supabase_client import get_service_role_client
from models.types import JobType, TaxonomyTag
from providers.email import get_email_provider
from providers.embeddings import get_embeddings_provider
from providers.llm import get_llm_provider
from providers.scraper import get_scraper_provider
from workers.handlers.account_deletion import delete_expired_accounts
from workers.handlers.enrich_menu_photo import handle_enrich_menu_photo
from workers.handlers.enrich_shop import handle_enrich_shop
from workers.handlers.generate_embedding import handle_generate_embedding
from workers.handlers.publish_shop import handle_publish_shop
from workers.handlers.scrape_shop import handle_scrape_shop
from workers.handlers.staleness_sweep import handle_smart_staleness_sweep
from workers.handlers.weekly_email import handle_weekly_email
from workers.queue import JobQueue

logger = structlog.get_logger()


async def process_job_queue() -> None:
    """Poll the job queue and process one job per iteration."""
    db = get_service_role_client()
    queue = JobQueue(db=db)

    job = await queue.claim()
    if not job:
        return

    logger.info("Processing job", job_id=job.id, job_type=job.job_type)

    try:
        match job.job_type:
            case JobType.ENRICH_SHOP | JobType.ENRICH_MENU_PHOTO:
                taxonomy_rows = db.table("taxonomy_tags").select("*").execute()
                taxonomy = [TaxonomyTag(**row) for row in taxonomy_rows.data]  # type: ignore[arg-type]
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
            case JobType.PUBLISH_SHOP:
                await handle_publish_shop(
                    payload=job.payload,
                    db=db,
                )
            case _:
                logger.warning("Unknown job type", job_type=job.job_type)

        await queue.complete(job.id)
        logger.info("Job completed", job_id=job.id)
    except Exception as e:
        logger.error("Job failed", job_id=job.id, error=str(e))
        await queue.fail(job.id, error=str(e))


async def run_staleness_sweep() -> None:
    """Cron wrapper: enqueue a staleness sweep job."""
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.STALENESS_SWEEP, payload={})


async def run_weekly_email() -> None:
    """Cron wrapper: enqueue a weekly email job."""
    db = get_service_role_client()
    queue = JobQueue(db=db)
    await queue.enqueue(job_type=JobType.WEEKLY_EMAIL, payload={})


def create_scheduler() -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler(timezone="Asia/Taipei")

    # Cron jobs
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
    # Account deletion cleanup (daily at 4 AM)
    scheduler.add_job(
        delete_expired_accounts,
        "cron",
        hour=4,
        id="delete_expired_accounts",
    )

    # Job queue polling (every 30 seconds)
    scheduler.add_job(
        process_job_queue,
        "interval",
        seconds=30,
        id="process_queue",
    )

    return scheduler
