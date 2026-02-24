from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from api.checkins import router as checkins_router
from api.lists import router as lists_router
from api.search import router as search_router
from api.shops import router as shops_router
from api.stamps import router as stamps_router
from core.config import settings
from workers.scheduler import create_scheduler

logger = structlog.get_logger()

scheduler = create_scheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Startup and shutdown events."""
    logger.info("Starting CafeRoam API", environment=settings.environment)
    if settings.environment != "test":
        scheduler.start()
        logger.info("Scheduler started")
    yield
    if settings.environment != "test":
        scheduler.shutdown()
    logger.info("Shutting down CafeRoam API")


app = FastAPI(
    title="CafeRoam API",
    description="Backend API for CafeRoam coffee shop directory",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(shops_router)
app.include_router(search_router)
app.include_router(checkins_router)
app.include_router(lists_router)
app.include_router(stamps_router)
