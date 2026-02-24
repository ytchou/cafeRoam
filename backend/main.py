from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

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


# Routers will be included here in Task 9
