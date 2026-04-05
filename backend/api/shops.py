import contextlib
from datetime import datetime
from typing import Any, cast
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from pydantic.alias_generators import to_camel
from starlette.requests import Request

from api.deps import get_admin_db, get_optional_user
from core.config import settings
from core.db import first
from core.opening_hours import is_open_now
from db.supabase_client import get_anon_client
from middleware.rate_limit import limiter
from models.types import (
    ShopCheckInPreview,
    ShopCheckInSummary,
    ShopReview,
    ShopReviewsResponse,
    TaxonomyTag,
)

_TW = ZoneInfo("Asia/Taipei")

router = APIRouter(prefix="/shops", tags=["shops"])


def _extract_taxonomy_tags(raw_tags: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = []
    for tag_row in raw_tags:
        raw = tag_row.get("taxonomy_tags")
        if not raw:
            continue
        with contextlib.suppress(ValidationError):
            result.append(TaxonomyTag(**raw).model_dump(by_alias=True))
    return result


def _extract_display_name(row: dict[str, Any]) -> str | None:
    profiles = row.get("profiles")
    if not profiles:
        return None
    return cast("str | None", profiles.get("display_name"))


_SHOP_LIST_COLUMNS = (
    "id, name, slug, address, city, mrt, latitude, longitude, "
    "rating, review_count, description, processing_status, "
    "mode_work, mode_rest, mode_social, "
    "community_summary, opening_hours, payment_methods, "
    "created_at"
)

_SHOP_DETAIL_COLUMNS = (
    f"{_SHOP_LIST_COLUMNS}, phone, website, price_range, google_place_id, updated_at"
)


@limiter.limit(settings.rate_limit_shops_list)
@router.get("/")
async def list_shops(
    request: Request,
    city: str | None = None,
    featured: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Any]:
    """List shops. Public — no auth required."""
    db = get_anon_client()
    query = db.table("shops").select(
        f"{_SHOP_LIST_COLUMNS}, shop_photos(url), shop_claims(status), "
        "shop_tags(tag_id, taxonomy_tags(id, dimension, label, label_zh))"
    )
    if city:
        query = query.eq("city", city)
    if featured:
        query = query.eq("processing_status", "live")
    query = query.limit(limit)
    response = query.execute()
    rows = cast("list[dict[str, Any]]", response.data or [])
    now = datetime.now(_TW)
    result = []
    for row in rows:
        photo_urls = [p["url"] for p in (row.pop("shop_photos", None) or [])]
        raw_claims = row.pop("shop_claims", None) or []
        raw_tags = row.pop("shop_tags", None) or []
        claim_status = first(raw_claims, "shop_claims")["status"] if raw_claims else None
        taxonomy_tags = _extract_taxonomy_tags(raw_tags)
        opening_hours = row.pop("opening_hours", None)
        open_status = is_open_now(opening_hours, now)
        camel = {to_camel(k): v for k, v in row.items()}
        camel["photoUrls"] = photo_urls
        camel["claimStatus"] = claim_status
        camel["taxonomyTags"] = taxonomy_tags
        camel["isOpen"] = open_status
        result.append(camel)
    return result


@router.get("/{shop_id}")
async def get_shop(shop_id: str) -> Any:
    """Get a single shop by ID. Public — no auth required."""
    db = get_anon_client()
    response = (
        db.table("shops")
        .select(
            f"{_SHOP_DETAIL_COLUMNS}, shop_photos(url), "
            "shop_tags(tag_id, taxonomy_tags(id, dimension, label, label_zh)), "
            "shop_claims(status, user_id), "
            "shop_content(id, title, body, photo_url, is_published, updated_at, content_type), "
            "districts(slug, name_zh)"
        )
        .eq("id", shop_id)
        .limit(1)
        .execute()
    )

    rows = cast("list[dict[str, Any]]", response.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="Shop not found")
    shop: dict[str, Any] = rows[0]

    photo_urls = [row["url"] for row in (shop.pop("shop_photos", None) or [])]
    raw_tags = shop.pop("shop_tags", None) or []
    raw_claims = shop.pop("shop_claims", None) or []
    raw_content = shop.pop("shop_content", None) or []
    approved_claim = next((c for c in raw_claims if c.get("status") == "approved"), None)
    claim_status = first(raw_claims, "shop_claims")["status"] if raw_claims else None
    owner_user_id: str | None = approved_claim.get("user_id") if approved_claim else None
    taxonomy_tags = _extract_taxonomy_tags(raw_tags)
    mode_scores = {
        "work": shop.pop("mode_work", None),
        "rest": shop.pop("mode_rest", None),
        "social": shop.pop("mode_social", None),
    }

    owner_story = None
    for row in raw_content:
        if row.get("content_type") == "story" and row.get("is_published"):
            owner_story = {to_camel(k): v for k, v in row.items() if k != "content_type"}
            break

    raw_district = shop.pop("districts", None)
    response_data: dict[str, Any] = {to_camel(k): v for k, v in shop.items()}
    response_data["photoUrls"] = photo_urls
    response_data["modeScores"] = mode_scores
    response_data["taxonomyTags"] = taxonomy_tags
    response_data["claimStatus"] = claim_status
    response_data["ownerId"] = owner_user_id
    response_data["ownerStory"] = owner_story
    response_data["district"] = (
        {"slug": raw_district["slug"], "nameZh": raw_district["name_zh"]} if raw_district else None
    )
    return response_data


@router.get("/{shop_id}/checkins")
async def get_shop_checkins(
    shop_id: str,
    limit: int = Query(default=9, ge=1, le=50),
    user: dict[str, Any] | None = Depends(get_optional_user),  # noqa: B008
) -> list[dict[str, Any]] | dict[str, Any]:
    """Get check-ins for a shop. Auth-gated response shape.

    Authenticated: full check-in summaries with display names.
    Unauthenticated: count + one representative photo.
    """
    db = get_admin_db()

    if user:
        response = (
            db.table("check_ins")
            .select(
                "id, user_id, photo_urls, note, created_at, stars, review_text, "
                "confirmed_tags, reviewed_at, profiles(display_name)"
            )
            .eq("shop_id", shop_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = cast("list[dict[str, Any]]", response.data)
        return [
            ShopCheckInSummary(
                id=row["id"],
                user_id=row["user_id"],
                display_name=_extract_display_name(row),
                photo_url=str(row["photo_urls"][0]) if row.get("photo_urls") else "",
                note=row.get("note"),
                created_at=row["created_at"],
                stars=row.get("stars"),
                review_text=row.get("review_text"),
                confirmed_tags=row.get("confirmed_tags"),
                reviewed_at=row.get("reviewed_at"),
            ).model_dump(by_alias=True)
            for row in rows
        ]
    else:
        response = (
            db.table("check_ins")
            .select("photo_urls", count="exact")  # type: ignore[arg-type]
            .eq("shop_id", shop_id)
            .limit(1)
            .execute()
        )
        rows_preview = cast("list[dict[str, Any]]", response.data)
        first_row = first(rows_preview, "shop checkins preview") if response.data else None
        preview_url = (
            first_row["photo_urls"][0] if first_row and first_row.get("photo_urls") else None
        )
        return ShopCheckInPreview(
            count=response.count or 0,
            preview_photo_url=preview_url,
        ).model_dump(by_alias=True)


@router.get("/{shop_id}/reviews")
async def get_shop_reviews(
    shop_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: Any = Depends(get_admin_db),  # noqa: B008
) -> dict[str, Any]:
    """Get reviews for a shop. Public endpoint — no auth required.

    Returns paginated reviews (check-ins with stars), total count, and average rating.
    Uses admin DB (bypasses RLS) for consistent reads — matches checkins endpoint pattern.
    DEV-237: reviews are publicly visible per auth wall spec (shop detail content is public).
    """

    response = (
        db.table("check_ins")
        .select(
            "id, user_id, stars, review_text, confirmed_tags, reviewed_at, profiles(display_name)",
            count="exact",
        )
        .eq("shop_id", shop_id)
        .eq("is_public", True)
        .not_.is_("stars", "null")
        .order("reviewed_at", desc=True)
        .limit(limit)
        .offset(offset)
        .execute()
    )

    review_rows = cast("list[dict[str, Any]]", response.data)
    reviews = [
        ShopReview(
            id=row["id"],
            user_id=row["user_id"],
            display_name=_extract_display_name(row),
            stars=row["stars"],
            review_text=row.get("review_text"),
            confirmed_tags=row.get("confirmed_tags"),
            reviewed_at=row["reviewed_at"],
        )
        for row in review_rows
    ]

    total_count = response.count or 0

    avg_response = db.rpc("shop_avg_rating", {"p_shop_id": shop_id}).execute()
    average_rating = float(avg_response.data) if avg_response.data else 0.0

    return ShopReviewsResponse(
        reviews=reviews,
        total_count=total_count,
        average_rating=round(average_rating, 1),
    ).model_dump(by_alias=True)
