# backend/api/profile.py
from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from api.deps import get_current_user, get_user_db
from models.types import PreferenceOnboardingRequest, ProfileUpdateRequest
from services.profile_service import ProfileService

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
async def get_profile(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    service = ProfileService(db=db)
    result = await service.get_profile(user["id"])
    return result.model_dump()


@router.patch("")
async def update_profile(
    body: ProfileUpdateRequest,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, str]:
    service = ProfileService(db=db)
    await service.update_profile(
        user["id"],
        fields=body.model_fields_set,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
        analytics_opt_out=body.analytics_opt_out,
    )
    return {"message": "Profile updated"}


# --- DEV-297: preference onboarding ---


@router.get("/preferences/status")
async def get_preferences_status(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    svc = ProfileService(db)
    status = await svc.get_preference_status(user["id"])
    return status.model_dump(by_alias=True)


@router.post("/preferences")
async def save_preferences(
    body: PreferenceOnboardingRequest,
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    svc = ProfileService(db)
    status = await svc.save_preferences(user["id"], body)
    return status.model_dump(by_alias=True)


@router.post("/preferences/dismiss")
async def dismiss_preferences(
    user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    db: Client = Depends(get_user_db),  # noqa: B008
) -> dict[str, Any]:
    svc = ProfileService(db)
    status = await svc.dismiss_preferences(user["id"])
    return status.model_dump(by_alias=True)
