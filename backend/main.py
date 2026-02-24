from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from api.checkins import router as checkins_router
from api.lists import router as lists_router
from api.search import router as search_router
from api.shops import router as shops_router
from api.stamps import router as stamps_router
from core.config import settings

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting CafeRoam API", environment=settings.environment)
    # Workers/scheduler will be started here in Task 11
    yield
    logger.info("Shutting down CafeRoam API")


app = FastAPI(
    title="CafeRoam API",
    description="Backend API for CafeRoam coffee shop directory",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(shops_router)
app.include_router(search_router)
app.include_router(checkins_router)
app.include_router(lists_router)
app.include_router(stamps_router)
