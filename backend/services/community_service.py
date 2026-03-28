from typing import Any, cast

from supabase import Client

from models.types import (
    CommunityFeedResponse,
    CommunityNoteAuthor,
    CommunityNoteCard,
)

_NOTE_SELECT = (
    "id,"
    "is_public,"
    "review_text,"
    "stars,"
    "photo_urls,"
    "created_at,"
    "profiles!check_ins_user_id_fkey(display_name, avatar_url),"
    "shops!check_ins_shop_id_fkey(name, slug, mrt),"
    "community_note_likes(count)"
)


def _extract_count(count_rows: list[dict[str, Any]] | None) -> int:
    """Extract the count value from a PostgREST count aggregate response."""
    if not count_rows:
        return 0
    first = next(iter(count_rows), None)
    if not first:
        return 0
    return int(first.get("count", 0))


class CommunityService:
    def __init__(self, db: Client):
        self._db = db

    def get_preview(self, limit: int = 3) -> list[CommunityNoteCard]:
        response = (
            self._db.table("check_ins")
            .select(_NOTE_SELECT)
            .eq("is_public", True)
            .not_.is_("review_text", "null")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data or [])
        return [self._row_to_card(row) for row in rows]

    def get_feed(
        self,
        cursor: str | None,
        limit: int = 10,
        mrt: str | None = None,
        vibe_tag: str | None = None,
    ) -> CommunityFeedResponse:
        query = (
            self._db.table("check_ins")
            .select(_NOTE_SELECT)
            .eq("is_public", True)
            .not_.is_("review_text", "null")
            .order("created_at", desc=True)
            .limit(limit + 1)
        )
        if cursor:
            query = query.lt("created_at", cursor)
        if mrt:
            shop_resp = self._db.table("shops").select("id").eq("mrt", mrt).execute()
            shop_rows = cast("list[dict[str, Any]]", shop_resp.data or [])
            shop_ids = [row["id"] for row in shop_rows]
            if not shop_ids:
                return CommunityFeedResponse(notes=[], next_cursor=None)
            query = query.in_("shop_id", shop_ids)
        if vibe_tag:
            tag_resp = (
                self._db.table("shop_tags").select("shop_id").eq("tag_id", vibe_tag).execute()
            )
            tag_rows = cast("list[dict[str, Any]]", tag_resp.data or [])
            tag_shop_ids = [row["shop_id"] for row in tag_rows]
            if not tag_shop_ids:
                return CommunityFeedResponse(notes=[], next_cursor=None)
            query = query.in_("shop_id", tag_shop_ids)

        response = query.execute()
        rows = cast("list[dict[str, Any]]", response.data or [])

        has_more = len(rows) > limit
        page_rows = rows[:limit]

        next_cursor: str | None = None
        if has_more and page_rows:
            next_cursor = page_rows[-1]["created_at"]

        return CommunityFeedResponse(
            notes=[self._row_to_card(row) for row in page_rows],
            next_cursor=next_cursor,
        )

    def toggle_like(self, checkin_id: str, user_id: str) -> int:
        ci = (
            self._db.table("check_ins")
            .select("id")
            .eq("id", checkin_id)
            .eq("is_public", True)
            .maybe_single()
            .execute()
        )
        if ci is None or ci.data is None:
            raise ValueError(f"Check-in {checkin_id!r} not found or not public")

        existing = (
            self._db.table("community_note_likes")
            .select("id")
            .eq("checkin_id", checkin_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if existing is not None and existing.data:
            self._db.table("community_note_likes").delete().eq("checkin_id", checkin_id).eq(
                "user_id", user_id
            ).execute()
        else:
            self._db.table("community_note_likes").insert(
                {"checkin_id": checkin_id, "user_id": user_id}
            ).execute()

        count_resp = (
            self._db.table("community_note_likes")
            .select("id")
            .eq("checkin_id", checkin_id)
            .execute()
        )
        return len(count_resp.data or [])

    def is_liked(self, checkin_id: str, user_id: str) -> bool:
        result = (
            self._db.table("community_note_likes")
            .select("id")
            .eq("checkin_id", checkin_id)
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        return result is not None and result.data is not None

    def _row_to_card(self, row: dict[str, Any]) -> CommunityNoteCard:
        profile: dict[str, Any] = row.get("profiles") or {}
        shop: dict[str, Any] = row.get("shops") or {}
        display_name: str = profile.get("display_name") or "Anonymous"
        avatar_url: str | None = profile.get("avatar_url")

        shop_name: str = shop.get("name") or ""
        shop_slug: str = shop.get("slug") or ""
        shop_mrt: str | None = shop.get("mrt")

        photo_urls = row.get("photo_urls") or []
        cover = photo_urls[0] if photo_urls else None

        checkin_id = row.get("id") or row.get("checkin_id", "")

        return CommunityNoteCard(
            checkin_id=checkin_id,
            author=CommunityNoteAuthor(
                display_name=display_name,
                avatar_url=avatar_url,
                role_label="Contributor",
            ),
            review_text=row["review_text"],
            star_rating=row.get("stars"),
            cover_photo_url=cover,
            shop_name=shop_name,
            shop_slug=shop_slug,
            shop_location=shop_mrt,
            like_count=_extract_count(row.get("community_note_likes")),
            created_at=row["created_at"],
        )
