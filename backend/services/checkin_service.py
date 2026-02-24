from datetime import UTC, datetime
from typing import Any, cast

from supabase import Client

from models.types import CheckIn, JobType


class CheckInService:
    def __init__(self, db: Client):
        self._db = db

    async def create(
        self,
        user_id: str,
        shop_id: str,
        photo_urls: list[str],
        menu_photo_url: str | None = None,
        note: str | None = None,
    ) -> CheckIn:
        """Create a check-in, award a stamp, and optionally queue menu photo enrichment."""
        if len(photo_urls) < 1:
            raise ValueError("At least one photo is required for check-in")

        checkin_data = {
            "user_id": user_id,
            "shop_id": shop_id,
            "photo_urls": photo_urls,
            "menu_photo_url": menu_photo_url,
            "note": note,
        }
        response = self._db.table("check_ins").insert(checkin_data).execute()
        rows = cast("list[dict[str, Any]]", response.data)
        checkin_row = rows[0]

        stamp_data = {
            "user_id": user_id,
            "shop_id": shop_id,
            "check_in_id": checkin_row["id"],
            "design_url": f"/stamps/{shop_id}.svg",
        }
        self._db.table("stamps").insert(stamp_data).execute()

        if menu_photo_url:
            self._db.table("job_queue").insert({
                "job_type": JobType.ENRICH_MENU_PHOTO.value,
                "payload": {
                    "shop_id": shop_id,
                    "image_url": menu_photo_url,
                },
                "status": "pending",
                "priority": 5,
                "scheduled_at": datetime.now(UTC).isoformat(),
            }).execute()

        return CheckIn(**checkin_row)

    async def get_by_user(self, user_id: str) -> list[CheckIn]:
        response = (
            self._db.table("check_ins")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data)
        return [CheckIn(**row) for row in rows]

    async def get_by_shop(self, shop_id: str) -> list[CheckIn]:
        response = (
            self._db.table("check_ins")
            .select("*")
            .eq("shop_id", shop_id)
            .order("created_at", desc=True)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data)
        return [CheckIn(**row) for row in rows]
