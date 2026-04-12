import contextlib
import time
from datetime import UTC, datetime
from typing import Any, cast

import structlog
from supabase import Client

from core.lang import is_zh_dominant
from models.types import JobType, ShopEnrichmentInput
from providers.llm.interface import LLMProvider
from workers.job_guard import check_job_still_claimed
from workers.job_log import log_job_event
from workers.queue import JobQueue

logger = structlog.get_logger()


async def handle_enrich_shop(
    payload: dict[str, Any],
    db: Client,
    llm: LLMProvider,
    queue: JobQueue,
    job_id: str | None = None,
) -> None:
    """Enrich a shop with AI-generated tags and summary."""
    shop_id = payload["shop_id"]
    job_id = cast("str", job_id)
    step_timings: dict[str, dict[str, int]] = {}
    logger.info("Enriching shop", shop_id=shop_id)

    _failure_recorded = False
    try:
        await log_job_event(
            db,
            job_id,
            "info",
            "job.start",
            job_type="enrich_shop",
            shop_id=str(shop_id),
        )

        t0 = time.monotonic()
        shop_response = (
            db.table("shops")
            .select(
                "id, name, description, categories, price_range, "
                "socket, limited_time, rating, review_count, google_maps_features"
            )
            .eq("id", shop_id)
            .single()
            .execute()
        )
        shop = cast("dict[str, Any]", shop_response.data)

        reviews_response = db.table("shop_reviews").select("text").eq("shop_id", shop_id).execute()
        review_rows = cast("list[dict[str, Any]]", reviews_response.data)
        reviews = [r["text"] for r in review_rows if r.get("text")]

        vibe_photos_response = (
            db.table("shop_photos")
            .select("url")
            .eq("shop_id", shop_id)
            .eq("category", "VIBE")
            .limit(3)
            .execute()
        )
        vibe_photo_rows = cast("list[dict[str, Any]]", vibe_photos_response.data)
        vibe_photo_urls = [r["url"] for r in vibe_photo_rows if r.get("url")]

        enrichment_input = ShopEnrichmentInput(
            name=shop["name"],
            reviews=reviews,
            description=shop.get("description"),
            categories=shop.get("categories", []),
            price_range=shop.get("price_range"),
            socket=shop.get("socket"),
            limited_time=shop.get("limited_time"),
            rating=shop.get("rating"),
            review_count=shop.get("review_count"),
            google_maps_features=shop.get("google_maps_features") or {},
            vibe_photo_urls=vibe_photo_urls,
        )
        step_timings["fetch_data"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        await log_job_event(
            db,
            job_id,
            "info",
            "llm.call",
            provider="anthropic",
            method="enrich_shop",
        )

        t0 = time.monotonic()
        result = await llm.enrich_shop(enrichment_input)
        step_timings["llm_call"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        if job_id and not await check_job_still_claimed(queue, job_id):
            await log_job_event(db, job_id, "warn", "job.aborted_midflight", shop_id=str(shop_id))
            return

        if result.summary and not is_zh_dominant(result.summary):
            logger.warning(
                "Enrichment summary is not zh-TW dominant — marking failed",
                shop_id=shop_id,
                summary_preview=result.summary[:80],
            )
            db.table("shops").update(
                {
                    "processing_status": "failed",
                    "rejection_reason": "Enrichment failed: summary not in Traditional Chinese",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", shop_id).execute()
            _failure_recorded = True
            raise ValueError(f"Enrichment summary for shop {shop_id} is not in Traditional Chinese")

        t0 = time.monotonic()
        mode = result.mode_scores
        if job_id and not await check_job_still_claimed(queue, job_id):
            logger.warning("job.aborted_midflight job_id=%s handler=enrich_shop", job_id)
            await log_job_event(db, job_id, "warn", "job.aborted_midflight", shop_id=str(shop_id))
            return
        db.table("shops").update(
            {
                "description": result.summary,
                "enriched_at": datetime.now(UTC).isoformat(),
                "mode_work": mode.work if mode else None,
                "mode_rest": mode.rest if mode else None,
                "mode_social": mode.social if mode else None,
                "processing_status": "embedding",
                "menu_highlights": result.menu_highlights,
                "coffee_origins": result.coffee_origins,
            }
        ).eq("id", shop_id).execute()
        await log_job_event(
            db,
            job_id,
            "info",
            "db.write",
            table="shops",
            columns=["description", "enriched_at", "tags"],
        )

        # Re-enrichment replaces tags, not appends
        if job_id and not await check_job_still_claimed(queue, job_id):
            logger.warning("job.aborted_midflight job_id=%s handler=enrich_shop", job_id)
            await log_job_event(db, job_id, "warn", "job.aborted_midflight", shop_id=str(shop_id))
            return
        db.table("shop_tags").delete().eq("shop_id", shop_id).execute()
        if result.tags:
            tag_rows = [
                {
                    "shop_id": shop_id,
                    "tag_id": tag.id,
                    "confidence": result.tag_confidences.get(tag.id, 0.0),
                }
                for tag in result.tags
            ]
            db.table("shop_tags").insert(tag_rows).execute()

        try:
            tarot = await llm.assign_tarot(enrichment_input)
            if tarot.tarot_title:
                db.table("shops").update(
                    {
                        "tarot_title": tarot.tarot_title,
                        "flavor_text": tarot.flavor_text,
                    }
                ).eq("id", shop_id).execute()
                logger.info("Tarot assigned", shop_id=shop_id, title=tarot.tarot_title)
        except Exception:
            logger.warning("Tarot enrichment failed — continuing", shop_id=shop_id, exc_info=True)
        step_timings["db_write"] = {"duration_ms": int((time.monotonic() - t0) * 1000)}

        # --- Review-sourced menu items (DEV-313) ---
        if result.menu_items:
            # Delete existing review-sourced items for this shop
            db.table("shop_menu_items").delete().eq("shop_id", shop_id).eq(
                "source", "review"
            ).execute()

            # Photo-wins: check which items already exist from photos
            photo_items = (
                db.table("shop_menu_items")
                .select("item_name")
                .eq("shop_id", shop_id)
                .eq("source", "photo")
                .execute()
                .data
            )
            photo_names = {row["item_name"] for row in photo_items}

            # Filter out items that already exist from photos
            review_rows = [
                {
                    "shop_id": shop_id,
                    "item_name": item["name"],
                    "price": item.get("price"),
                    "category": item.get("category"),
                    "source": "review",
                    "source_photo_id": None,
                    "extracted_at": datetime.now(UTC).isoformat(),
                }
                for item in result.menu_items
                if item.get("name") and item["name"] not in photo_names
            ]

            if review_rows:
                db.table("shop_menu_items").insert(review_rows).execute()
                logger.info(
                    "Review-sourced menu items written",
                    shop_id=shop_id,
                    count=len(review_rows),
                )

        enqueue_payload: dict[str, Any] = {"shop_id": shop_id}
        for key in ("submission_id", "submitted_by", "batch_id"):
            if payload.get(key):
                enqueue_payload[key] = payload[key]

        await queue.enqueue(
            job_type=JobType.SUMMARIZE_REVIEWS,
            payload=enqueue_payload,
            priority=5,
        )

        logger.info("Shop enriched", shop_id=shop_id, tag_count=len(result.tags))
        await log_job_event(db, job_id, "info", "job.end", status="ok")

    except Exception as exc:
        await log_job_event(db, job_id, "error", "job.error", error=str(exc))
        if not _failure_recorded and (not job_id or await check_job_still_claimed(queue, job_id)):
            db.table("shops").update(
                {
                    "processing_status": "failed",
                    "rejection_reason": f"Enrichment error: {exc}",
                    "updated_at": datetime.now(UTC).isoformat(),
                }
            ).eq("id", shop_id).execute()
        raise
    finally:
        if job_id is not None:
            with contextlib.suppress(Exception):
                (
                    db.table("job_queue")
                    .update({"step_timings": step_timings})
                    .eq("id", str(job_id))
                    .execute()
                )
