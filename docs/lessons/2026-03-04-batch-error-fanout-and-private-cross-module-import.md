# Batch Job Errors Must Be Fanned Out; Private Names Are Module-Local

**Date:** 2026-03-04
**Context:** Batch scraping refactor (feat/batch-scraping) — review findings

## What Happened

### Bug 1: Silent error drop in batch detail view

`get_batch_detail` queried for failed jobs with `payload->>batch_id = X`, then extracted errors via `payload.get("shop_id", "")`. For `scrape_batch` jobs, the payload shape is `{batch_id, shops: [{shop_id, ...}]}` — no top-level `shop_id`. Result: batch-level Apify failures were invisible in the admin UI.

**Fix pattern:** When a job's failure applies to multiple items (a batch), fan the error out to each item:

```python
if job_type == "scrape_batch":
    for shop in payload.get("shops", []):
        if shop.get("shop_id"):
            errors[shop["shop_id"]] = {"last_error": error, "stage": job_type}
else:
    sid = payload.get("shop_id", "")
    if sid:
        errors[sid] = {"last_error": error, "stage": job_type}
```

### Bug 2: Private function imported across module boundary

`scrape_batch.py` imported `_persist_scraped_data` from `scrape_shop.py` — a function with a `_` prefix (Python convention: module-private). This creates hidden coupling: renaming or moving the function silently breaks the importer.

**Fix pattern:** Shared helpers belong in a neutral module (`workers/persist.py`), not inside a handler. Move the function, make it public (no `_` prefix), update all importers.

### Bug 3: Status reset missing on persist failure in single-shop path

After extracting `_persist_scraped_data`, the batch handler (correctly) wrapped it in try/except and reset the shop to "failed" on error. The single-shop handler did not — so a review insert failure would leave the shop stuck at "enriching" forever.

**Fix pattern:** Whenever `persist_scraped_data` can raise, the caller must reset shop status on exception before re-raising:

```python
try:
    await persist_scraped_data(...)
except Exception as exc:
    logger.error("Failed to persist", shop_id=shop_id, error=str(exc))
    db.table("shops").update({"processing_status": "failed"}).eq("id", shop_id).execute()
    raise
```

## Root Cause

Payload schema divergence: adding a new job type with a different payload shape requires auditing every code path that reads `payload.get("shop_id")` — these are "stringly-typed" payload assumptions that silently break.

## Prevention

- When adding a new job type with a different payload shape, grep for `payload.get("shop_id")` and audit each call site.
- Never import `_private` names from another module — if you need it, it belongs in a shared module.
- Every `persist_scraped_data` call site must have a try/except that resets shop status on failure.
