import asyncio
from typing import Any, Literal

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps import get_claims_service, require_admin
from core.db import first
from db.supabase_client import get_service_role_client
from models.types import CamelModel
from services.claims_service import ClaimsService

logger = structlog.get_logger()
router = APIRouter(prefix="/admin/claims", tags=["admin-claims"])

ClaimRejectionReason = Literal["invalid_proof", "not_an_owner", "duplicate_request", "other"]


class RejectClaimBody(CamelModel):
    rejection_reason: ClaimRejectionReason


@router.get("")
async def list_claims(
    status: Literal["pending", "approved", "rejected"] | None = Query(default="pending"),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
    svc: ClaimsService = Depends(get_claims_service),  # noqa: B008
) -> list[dict[str, Any]]:
    return await svc.list_claims(status=status)


@router.get("/{claim_id}/proof-url")
async def get_proof_url(
    claim_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, str]:
    db = get_service_role_client()
    result = await asyncio.to_thread(
        lambda: db.table("shop_claims")
        .select("proof_photo_url")
        .eq("id", claim_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Claim not found")
    storage_path = first(result.data, "proof photo")["proof_photo_url"]
    signed = await asyncio.to_thread(
        lambda: db.storage.from_("claim-proofs").create_signed_url(storage_path, 3600)
    )
    return {"proofUrl": signed["signedUrl"]}


@router.post("/{claim_id}/approve")
async def approve_claim(
    claim_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
    svc: ClaimsService = Depends(get_claims_service),  # noqa: B008
) -> dict[str, str]:
    await svc.approve_claim(claim_id=claim_id, admin_user_id=user["id"])
    return {"message": "Claim approved"}


@router.post("/{claim_id}/reject")
async def reject_claim(
    claim_id: str,
    body: RejectClaimBody,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
    svc: ClaimsService = Depends(get_claims_service),  # noqa: B008
) -> dict[str, str]:
    await svc.reject_claim(
        claim_id=claim_id,
        reason=body.rejection_reason,
        admin_user_id=user["id"],
    )
    return {"message": "Claim rejected"}
