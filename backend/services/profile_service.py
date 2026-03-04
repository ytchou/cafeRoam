# backend/services/profile_service.py
from typing import Any, cast

from supabase import Client

from models.types import ProfileResponse


class ProfileService:
    def __init__(self, db: Client):
        self._db = db

    async def get_profile(self, user_id: str) -> ProfileResponse:
        # Get profile data
        profile_resp = (
            self._db.table("profiles")
            .select("display_name, avatar_url")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = cast("dict[str, Any]", profile_resp.data)

        # Get stamp count
        stamp_resp = (
            self._db.table("stamps")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        stamp_count = stamp_resp.count or 0

        # Get check-in count
        checkin_resp = (
            self._db.table("check_ins")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        checkin_count = checkin_resp.count or 0

        return ProfileResponse(
            display_name=profile.get("display_name"),
            avatar_url=profile.get("avatar_url"),
            stamp_count=stamp_count,
            checkin_count=checkin_count,
        )

    async def update_profile(
        self,
        user_id: str,
        display_name: str | None = None,
        avatar_url: str | None = None,
    ) -> None:
        update_data: dict[str, Any] = {}
        if display_name is not None:
            update_data["display_name"] = display_name
        if avatar_url is not None:
            update_data["avatar_url"] = avatar_url

        if not update_data:
            raise ValueError("No fields to update")

        self._db.table("profiles").update(update_data).eq("id", user_id).execute()
