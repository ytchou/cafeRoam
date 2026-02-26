import re
from typing import Any, cast

import structlog
from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from pydantic import BaseModel, field_validator
from supabase import Client

from api.deps import get_current_user, get_user_db
from db.supabase_client import get_service_role_client
from models.types import JobType
from workers.queue import JobQueue

logger = structlog.get_logger()

router = APIRouter(tags=["submissions"])

_MAPS_URL_PATTERN = re.compile(
    r"^https?://(www\.)?(google\.(com|com\.tw)/maps|maps\.google\.(com|com\.tw)|goo\.gl/maps|maps\.app\.goo\.gl)"
)


class SubmitShopRequest(BaseModel):
    google_maps_url: str

    @field_validator("google_maps_url")
    @classmethod
    def validate_maps_url(cls, v: str) -> str:
        if not _MAPS_URL_PATTERN.match(v):
            raise ValueError("Must be a valid Google Maps URL")
        return v


class SubmitShopResponse(BaseModel):
    submission_id: str
    message: str


@router.post("/submissions", status_code=201, response_model=SubmitShopResponse)
async def submit_shop(
    body: SubmitShopRequest,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> SubmitShopResponse:
    """Submit a Google Maps URL to add a new shop."""
    user_id = user["id"]

    # Check for duplicate submission (unique constraint enforces this at DB level too)
    existing = (
        db.table("shop_submissions")
        .select("id")
        .eq("google_maps_url", body.google_maps_url)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="This URL has already been submitted")
    # Note: unique constraint on google_maps_url handles the TOCTOU case

    # Create submission record (via user's RLS context)
    # Unique constraint on google_maps_url catches any TOCTOU race
    try:
        sub_response = (
            db.table("shop_submissions")
            .insert(
                {
                    "submitted_by": user_id,
                    "google_maps_url": body.google_maps_url,
                }
            )
            .execute()
        )
    except APIError as e:
        if "uq_shop_submissions_url" in str(e) or "23505" in str(e):
            raise HTTPException(status_code=409, detail="This URL has already been submitted")
        raise
    sub_data = cast("list[dict[str, Any]]", sub_response.data)
    submission_id = sub_data[0]["id"]

    # Create pending shop (via service role — needs write access)
    svc_db = get_service_role_client()
    shop_response = (
        svc_db.table("shops")
        .insert(
            {
                "name": "Pending",
                "address": "Pending",
                "latitude": 0,
                "longitude": 0,
                "review_count": 0,
                "processing_status": "pending",
                "source": "user_submission",
            }
        )
        .execute()
    )
    shop_data = cast("list[dict[str, Any]]", shop_response.data)
    shop_id = shop_data[0]["id"]

    # Queue scrape job
    queue = JobQueue(db=svc_db)
    await queue.enqueue(
        job_type=JobType.SCRAPE_SHOP,
        payload={
            "shop_id": shop_id,
            "google_maps_url": body.google_maps_url,
            "submission_id": submission_id,
            "submitted_by": user_id,
        },
        priority=2,
    )

    logger.info("Shop submission created", submission_id=submission_id, shop_id=shop_id)

    return SubmitShopResponse(
        submission_id=submission_id,
        message="Thanks! We're adding this shop to CafeRoam.",
    )
