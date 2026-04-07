from datetime import UTC, datetime
from typing import Any, cast
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from postgrest.exceptions import APIError
from pydantic import BaseModel

from api.deps import require_admin
from core.db import escape_ilike, first
from db.supabase_client import get_service_role_client
from middleware.admin_audit import log_admin_action
from models.types import JobStatus, JobType, ProcessingStatus
from providers.embeddings import EmbeddingsProvider, get_embeddings_provider
from workers.queue import JobQueue

router = APIRouter(prefix="/admin/shops", tags=["admin"])


class CreateShopRequest(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    google_maps_url: str | None = None


class UpdateShopRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    phone: str | None = None
    website: str | None = None
    opening_hours: list[str] | None = None
    description: str | None = None
    processing_status: ProcessingStatus | None = None


class EnqueueRequest(BaseModel):
    job_type: JobType


class BulkApproveRequest(BaseModel):
    shop_ids: list[str] | None = None


@router.get("/pipeline-status")
async def pipeline_status(
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, int]:
    """Return shop counts grouped by processing_status."""
    db = get_service_role_client()
    response = db.table("shops").select("processing_status").execute()
    counts: dict[str, int] = {}
    for row in response.data or []:
        s = row["processing_status"]
        counts[s] = counts.get(s, 0) + 1
    return counts


@router.get("/")
async def list_shops(
    processing_status: str | None = None,
    source: str | None = None,
    search: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """List all shops with optional filters."""
    db = get_service_role_client()
    query = db.table("shops").select(
        "id, name, address, processing_status, source, enriched_at, embedding, shop_tags(count)",
        count="exact",
    )

    if processing_status:
        query = query.eq("processing_status", processing_status)
    if source:
        query = query.eq("source", source)
    if search:
        query = query.ilike("name", f"%{escape_ilike(search)}%")

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    response = query.execute()

    shops = []
    for row in cast("list[dict[str, Any]]", response.data):
        row["has_embedding"] = row.pop("embedding", None) is not None
        row["tag_count"] = row.pop("shop_tags", [{}])[0].get("count", 0)
        shops.append(row)

    return {"shops": shops, "total": response.count or 0}


@router.post("/", status_code=201)
async def create_shop(
    body: CreateShopRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Manually create a shop."""
    db = get_service_role_client()
    response = (
        db.table("shops")
        .insert(
            {
                "name": body.name,
                "address": body.address,
                "latitude": body.latitude,
                "longitude": body.longitude,
                "google_maps_url": body.google_maps_url,
                "source": "manual",
                "processing_status": "pending",
                "review_count": 0,
            }
        )
        .execute()
    )
    shop = first(cast("list[dict[str, Any]]", response.data), "create shop")
    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/shops",
        target_type="shop",
        target_id=str(shop["id"]),
    )
    return shop


@router.post("/import/manual-csv", status_code=202)
async def import_manual_csv(
    file: UploadFile,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Upload a CSV with name,google_maps_url columns and batch-import shops.

    Accepts a UTF-8 CSV file (max 10 MB). Columns beyond name and google_maps_url
    are ignored. Rows with invalid Google Maps URLs or duplicate URLs within the
    file are silently skipped and counted in the response.
    """
    import csv
    import io

    from importers.prefilter import validate_google_maps_url

    content = await file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds 10 MB limit")

    text = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))

    invalid_url = 0
    duplicate_in_file = 0
    seen_urls: set[str] = set()
    candidates: list[dict[str, str]] = []

    for row in reader:
        name = (row.get("name") or "").strip()
        url = (row.get("google_maps_url") or "").strip()

        result = validate_google_maps_url(url)
        if not result.passed:
            invalid_url += 1
            continue

        if url in seen_urls:
            duplicate_in_file += 1
            continue

        seen_urls.add(url)
        candidates.append({"name": name, "google_maps_url": url})

    imported = 0
    skipped_duplicate = 0
    reset_to_pending = 0
    resettable_statuses = {"failed", "timed_out"}

    if candidates:
        db = get_service_role_client()
        candidate_urls = [c["google_maps_url"] for c in candidates]

        existing_resp = (
            db.table("shops")
            .select("google_maps_url, processing_status")
            .in_("google_maps_url", candidate_urls)
            .execute()
        )
        existing_rows = existing_resp.data or []
        resettable_urls: set[str] = {
            row["google_maps_url"]
            for row in existing_rows
            if row.get("processing_status") in resettable_statuses
        }
        skipped_urls: set[str] = {
            row["google_maps_url"]
            for row in existing_rows
            if row.get("processing_status") not in resettable_statuses
        }

        if resettable_urls:
            db.table("shops").update({"processing_status": "pending"}).in_(
                "google_maps_url", list(resettable_urls)
            ).execute()
            reset_to_pending = len(resettable_urls)

        skipped_duplicate = len(skipped_urls)

        new_rows = [
            {
                "name": c["name"],
                "google_maps_url": c["google_maps_url"],
                "source": "manual",
                "processing_status": "pending",
                "address": "",
                "review_count": 0,
            }
            for c in candidates
            if c["google_maps_url"] not in resettable_urls
            and c["google_maps_url"] not in skipped_urls
        ]

        if new_rows:
            db.table("shops").insert(new_rows).execute()
            imported = len(new_rows)

    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/shops/import/manual-csv",
        target_type="import",
        payload={
            "imported": imported,
            "skipped_duplicate": skipped_duplicate,
            "reset_to_pending": reset_to_pending,
            "invalid_url": invalid_url,
            "duplicate_in_file": duplicate_in_file,
        },
    )

    return {
        "imported": imported,
        "skipped_duplicate": skipped_duplicate,
        "reset_to_pending": reset_to_pending,
        "invalid_url": invalid_url,
        "duplicate_in_file": duplicate_in_file,
        "total": imported + skipped_duplicate + reset_to_pending + invalid_url + duplicate_in_file,
    }


@router.post("/bulk-approve")
async def bulk_approve(
    body: BulkApproveRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Approve pending_review shops, transitioning them to pending and queuing scrape jobs.

    Accepts explicit shop_ids (max 50) or approves all pending_review shops.
    """
    db = get_service_role_client()

    if body.shop_ids is not None:
        if len(body.shop_ids) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 shops per bulk-approve request")
        shops_to_approve = body.shop_ids
    else:
        # Approve all pending_review — capped at 200 to prevent request timeouts
        resp = (
            db.table("shops")
            .select("id")
            .eq("processing_status", ProcessingStatus.PENDING_REVIEW.value)
            .limit(200)
            .execute()
        )
        shops_to_approve = [row["id"] for row in cast("list[dict[str, Any]]", resp.data or [])]

    if not shops_to_approve:
        return {"approved": 0, "queued": 0}

    batch_id = str(uuid4())
    queue = JobQueue(db=db)

    # Batch SELECT — one round-trip to get all URLs, filtered to pending_review only
    url_resp = (
        db.table("shops")
        .select("id, google_maps_url")
        .in_("id", shops_to_approve)
        .eq("processing_status", ProcessingStatus.PENDING_REVIEW.value)
        .execute()
    )
    eligible = cast("list[dict[str, Any]]", url_resp.data or [])
    eligible_ids = [row["id"] for row in eligible]

    approved = 0
    if eligible_ids:
        # Batch UPDATE — conditional on status to guard against concurrent changes
        update_resp = (
            db.table("shops")
            .update({"processing_status": ProcessingStatus.PENDING.value})
            .in_("id", eligible_ids)
            .eq("processing_status", ProcessingStatus.PENDING_REVIEW.value)
            .execute()
        )
        approved = len(update_resp.data or [])

    # Build batch_shops from UPDATE result to stay consistent with approved count —
    # concurrent updates between SELECT and UPDATE could otherwise inflate queued vs approved.
    updated_ids = {row["id"] for row in (update_resp.data or [])} if eligible_ids else set()
    batch_shops = [
        {"shop_id": row["id"], "google_maps_url": row["google_maps_url"]}
        for row in eligible
        if row["id"] in updated_ids and row.get("google_maps_url")
    ]

    queued = 0
    if batch_shops:
        await queue.enqueue(
            job_type=JobType.SCRAPE_BATCH,
            payload={"batch_id": batch_id, "shops": batch_shops},
            priority=5,
        )
        queued = len(batch_shops)

    log_admin_action(
        admin_user_id=user["id"],
        action="POST /admin/shops/bulk-approve",
        target_type="import",
        payload={"approved": approved, "queued": queued, "batch_id": batch_id},
    )
    return {"approved": approved, "queued": queued, "batch_id": batch_id}


@router.get("/{shop_id}")
async def get_shop_detail(
    shop_id: str,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Full shop detail including tags, photos, and mode scores."""
    db = get_service_role_client()

    try:
        shop_resp = db.table("shops").select("*").eq("id", shop_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Shop {shop_id} not found") from None

    tags_resp = db.table("shop_tags").select("tag_id, confidence").eq("shop_id", shop_id).execute()
    photos_resp = (
        db.table("shop_photos")
        .select("id, url, category, is_menu, sort_order")
        .eq("shop_id", shop_id)
        .order("sort_order")
        .execute()
    )

    return {
        "shop": shop_resp.data,
        "tags": cast("list[dict[str, Any]]", tags_resp.data),
        "photos": cast("list[dict[str, Any]]", photos_resp.data),
    }


@router.put("/{shop_id}")
async def update_shop(
    shop_id: str,
    body: UpdateShopRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Update shop identity fields. Sets manually_edited_at timestamp."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["manually_edited_at"] = datetime.now(UTC).isoformat()
    updates["updated_at"] = datetime.now(UTC).isoformat()

    db = get_service_role_client()
    response = db.table("shops").update(updates).eq("id", shop_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail=f"Shop {shop_id} not found")

    log_admin_action(
        admin_user_id=user["id"],
        action="PUT /admin/shops",
        target_type="shop",
        target_id=shop_id,
    )
    return first(cast("list[dict[str, Any]]", response.data), "update shop")


@router.post("/{shop_id}/enqueue")
async def enqueue_job(
    shop_id: str,
    body: EnqueueRequest,
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
) -> dict[str, Any]:
    """Manually enqueue a pipeline job for a shop."""
    if body.job_type not in (JobType.ENRICH_SHOP, JobType.GENERATE_EMBEDDING, JobType.SCRAPE_BATCH):
        raise HTTPException(
            status_code=400, detail=f"Cannot manually enqueue {body.job_type.value}"
        )

    db = get_service_role_client()

    if body.job_type != JobType.SCRAPE_BATCH:
        existing = (
            db.table("job_queue")
            .select("id")
            .eq("job_type", body.job_type.value)
            .eq("status", JobStatus.PENDING.value)
            .eq("payload->>shop_id", shop_id)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail=f"A pending {body.job_type.value} job already exists for shop {shop_id}",
            )

    payload: dict[str, Any] = {"shop_id": shop_id}
    if body.job_type == JobType.SCRAPE_BATCH:
        try:
            shop_row = (
                db.table("shops").select("google_maps_url").eq("id", shop_id).single().execute()
            )
        except APIError as exc:
            raise HTTPException(status_code=404, detail=f"Shop {shop_id} not found") from exc
        url = shop_row.data.get("google_maps_url") if shop_row.data else None
        if not url:
            raise HTTPException(
                status_code=422,
                detail=f"Shop {shop_id} has no google_maps_url",
            )
        batch_id = str(uuid4())
        payload = {
            "batch_id": batch_id,
            "shops": [{"shop_id": str(shop_id), "google_maps_url": url}],
        }

    queue = JobQueue(db=db)
    job_id = await queue.enqueue(
        job_type=body.job_type,
        payload=payload,
        priority=5,
    )
    log_admin_action(
        admin_user_id=user["id"],
        action=f"POST /admin/shops/{shop_id}/enqueue",
        target_type="job",
        target_id=job_id,
        payload={"job_type": body.job_type.value, "shop_id": shop_id},
    )
    return {"job_id": job_id, "job_type": body.job_type.value}


@router.get("/{shop_id}/search-rank")
async def search_rank(
    shop_id: str,
    query: str = Query(..., min_length=1),
    user: dict[str, Any] = Depends(require_admin),  # noqa: B008
    embeddings: EmbeddingsProvider = Depends(get_embeddings_provider),  # noqa: B008
) -> dict[str, Any]:
    """Run a search query and return where this shop ranks in results."""
    query_embedding = await embeddings.embed(query)

    db = get_service_role_client()
    response = db.rpc(
        "admin_search_shops",
        {"query_embedding": query_embedding, "match_count": 50},
    ).execute()

    results = cast("list[dict[str, Any]]", response.data or [])
    rank = None
    for i, result in enumerate(results, 1):
        if str(result["id"]) == shop_id:
            rank = i
            break

    return {
        "rank": rank,
        "total_results": len(results),
        "query": query,
        "found": rank is not None,
    }
