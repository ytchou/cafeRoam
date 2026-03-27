import asyncio
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Query

from api.deps import get_claims_service, get_current_user
from core.db import first
from db.supabase_client import get_service_role_client
from models.types import CamelModel
from services.claims_service import ClaimsService

logger = structlog.get_logger()
router = APIRouter(prefix="/claims", tags=["claims"])

_MIME_EXT = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


class SubmitClaimBody(CamelModel):
    shop_id: str
    contact_name: str
    contact_email: str
    role: str
    proof_photo_path: str


class SubmitClaimResponse(CamelModel):
    claim_id: str
    message: str


@router.get("/upload-url")
async def get_upload_url(
    shop_id: str = Query(...),
    mime_type: str = Query(default="image/jpeg"),
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> dict[str, str]:
    """Return a presigned Supabase Storage upload URL for proof photo."""
    ext = _MIME_EXT.get(mime_type, "jpg")
    storage_path = f"{shop_id}/{user['id']}/proof.{ext}"
    db = get_service_role_client()
    result = await asyncio.to_thread(
        lambda: db.storage.from_("claim-proofs").create_signed_upload_url(storage_path)
    )
    return {"uploadUrl": result["signedUrl"], "storagePath": storage_path}


@router.post("", status_code=201, response_model=SubmitClaimResponse)
async def submit_claim(
    body: SubmitClaimBody,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    svc: ClaimsService = Depends(get_claims_service),  # noqa: B008
) -> SubmitClaimResponse:
    """Submit a shop ownership claim."""
    claim = await svc.submit_claim(
        user_id=user["id"],
        shop_id=body.shop_id,
        contact_name=body.contact_name,
        contact_email=body.contact_email,
        role=body.role,
        proof_photo_path=body.proof_photo_path,
    )
    return SubmitClaimResponse(claim_id=claim["id"], message="認領申請已送出")


@router.get("/me")
async def get_my_claim(
    shop_id: str = Query(...),
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> dict[str, Any]:
    """Return the current user's claim status for a given shop."""
    db = get_service_role_client()
    result = await asyncio.to_thread(
        lambda: db.table("shop_claims")
        .select("id, status")
        .eq("shop_id", shop_id)
        .eq("user_id", user["id"])
        .limit(1)
        .execute()
    )
    if result.data:
        row = first(result.data, "get my claim")
        return {"id": row["id"], "status": row["status"]}
    return {"id": None, "status": None}
