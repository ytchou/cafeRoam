"""Background URL validation worker.

Checks shops in pending_url_check status via HTTP HEAD requests.
Transitions: pending_url_check → pending_review (pass) | filtered_dead_url (fail)

Limitation: Cafe Nomad shops use constructed Google Maps search URLs
(https://www.google.com/maps/search/...) which always return HTTP 200.
These shops will always pass the URL check and move to pending_review.
This is acceptable for V1 — the admin review step is the effective quality gate
for Cafe Nomad imports. Google Takeout shops use canonical Maps URLs which can
return 404 for closed/removed places, making the check meaningful for that source.
"""

import asyncio
from typing import Any

import httpx
import structlog

logger = structlog.get_logger()

_BATCH_SIZE = 5
_BATCH_DELAY_SECONDS = 1.0
_REQUEST_TIMEOUT = 10.0


async def _check_single_url(
    client: httpx.AsyncClient,
    shop_id: str,
    url: str,
) -> tuple[str, bool]:
    """Check a single URL. Returns (shop_id, is_alive)."""
    try:
        response = await client.head(url, follow_redirects=True, timeout=_REQUEST_TIMEOUT)
        return shop_id, response.status_code < 400
    except Exception:
        return shop_id, False


async def check_urls_for_region(
    db: Any,
) -> dict[str, int]:
    """Run background URL validation for all pending_url_check shops.

    Returns:
        {"checked": N, "passed": N, "failed": N}
    """
    response = (
        db.table("shops")
        .select("id, google_maps_url")
        .eq("processing_status", "pending_url_check")
        .execute()
    )
    shops: list[dict[str, Any]] = response.data or []

    if not shops:
        logger.info("No pending_url_check shops found")
        return {"checked": 0, "passed": 0, "failed": 0}

    logger.info("Starting URL check batch", count=len(shops))

    passed_ids: list[str] = []
    failed_ids: list[str] = []

    async with httpx.AsyncClient() as client:
        for batch_start in range(0, len(shops), _BATCH_SIZE):
            batch = shops[batch_start : batch_start + _BATCH_SIZE]

            tasks = [
                _check_single_url(client, shop["id"], shop.get("google_maps_url", ""))
                for shop in batch
            ]
            results = await asyncio.gather(*tasks)

            for shop_id, is_alive in results:
                if is_alive:
                    passed_ids.append(shop_id)
                else:
                    failed_ids.append(shop_id)

            if batch_start + _BATCH_SIZE < len(shops):
                await asyncio.sleep(_BATCH_DELAY_SECONDS)

    if passed_ids:
        db.table("shops").update({"processing_status": "pending_review"}).in_(
            "id", passed_ids
        ).execute()
    if failed_ids:
        db.table("shops").update({"processing_status": "filtered_dead_url"}).in_(
            "id", failed_ids
        ).execute()

    passed = len(passed_ids)
    failed = len(failed_ids)
    logger.info("URL check complete", checked=len(shops), passed=passed, failed=failed)
    return {"checked": len(shops), "passed": passed, "failed": failed}
