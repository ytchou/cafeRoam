"""API routes for shop payment method queries and community confirmations."""

from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from api.deps import get_admin_db, get_current_user, get_optional_user, get_user_db
from models.types import PaymentConfirmRequest
from services.payment_service import PaymentService

router = APIRouter(tags=["payments"])


@router.get("/shops/{shop_id}/payment-methods")
async def get_payment_methods(
    shop_id: str,
    user: dict[str, Any] | None = Depends(get_optional_user),  # noqa: B008
    db: Client = Depends(get_admin_db),  # noqa: B008
) -> dict[str, Any]:
    """Get payment methods for a shop. Public — auth optional."""
    service = PaymentService(db=db)
    user_id = user["id"] if user else None
    result = service.get_payment_methods(shop_id=shop_id, user_id=user_id)
    return result.model_dump(by_alias=True)


@router.post("/shops/{shop_id}/payment-methods/confirm")
async def confirm_payment_method(
    shop_id: str,
    body: PaymentConfirmRequest,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    """Confirm or deny a payment method for a shop. Auth required."""
    service = PaymentService(db=db)
    result = service.upsert_confirmation(
        shop_id=shop_id, user_id=user["id"], method=body.method, vote=body.vote
    )
    return result.model_dump(by_alias=True)
