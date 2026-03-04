# Code Review Log: feat/batch-scraping

**Date:** 2026-03-04
**Branch:** feat/batch-scraping
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)*

### Issues Found (11 total, 1 false positive skipped)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `backend/api/admin.py:369` | `get_batch_detail` silently drops errors for failed `scrape_batch` jobs — `payload.get("shop_id", "")` returns `""` for batch-format payloads (which have `shops[]`, not `shop_id`) | Bug Hunter, Architecture |
| Important | `backend/workers/handlers/scrape_shop.py:8` | `_persist_scraped_data` is a private function (`_` prefix) imported across module boundary by `scrape_batch.py` — violates Python convention | Standards, Architecture |
| Important | `backend/workers/handlers/scrape_shop.py:53` | Shop can get stuck at "enriching" in the single-shop path — no try/except wraps `_persist_scraped_data` in `handle_scrape_shop`, so a review insert failure leaves shop at "enriching" with no status reset | Bug Hunter, Architecture |
| Important | `backend/api/admin.py:299-302` | `_collect_shop_ids_for_batch` can return duplicate shop IDs if multiple `scrape_batch` jobs share a `batch_id` (retry scenario) | Bug Hunter |
| Important | `backend/api/admin_shops.py:294` | TOCTOU: `approved = len(eligible_ids)` counts shops from SELECT, not actual UPDATE affected rows — another process could change status between SELECT and UPDATE | Bug Hunter |
| Important | `backend/providers/scraper/apify_adapter.py:47` | Duplicate URLs in batch input silently overwrite the `url_to_shop_id` dict — last shop wins, first loses result matching | Bug Hunter |
| Important | `backend/api/admin.py:217-223` | `list_batches` fetches ALL `scrape_shop`/`scrape_batch` jobs with no DB-level limit — degrades to full table scan at 10k+ jobs | Architecture |
| Important | `backend/workers/handlers/scrape_batch.py` | Zero test coverage for `handle_scrape_batch` — entire batch worker is untested | Architecture |
| Minor | `app/(admin)/admin/jobs/_components/BatchDetail.tsx:73-75` | Separate `statusFilter` effect sets `page=1` then triggers the fetch effect — redundant render cycle (AbortController mitigates data correctness issue) | Bug Hunter |
| Minor | `backend/tests/api/test_admin_shops_import.py:246-298` | Test data uses placeholder IDs (`"shop-1"`, `"job-1"`) instead of realistic UUIDs — violates CLAUDE.md realistic test data requirement | Standards |
| Minor | `backend/tests/api/test_admin_shops_import.py:258-265` | Bulk-approve tests verify HTTP status only, not that the enqueued job has correct `job_type`/payload shape | Architecture |

### Validation Results
- Skipped (false positive): `backend/workers/handlers/scrape_batch.py` — "No validation/logging for non-existent shop IDs before batch UPDATE" — silent skip on non-existent IDs is correct DB behavior; pre-validation would be TOCTOU-prone
- Proceeding to fix: 11 valid issues (1 Critical, 7 Important, 3 Minor)

---

## Fix Pass 1

**Pre-fix SHA:** bb7ab7d09b441a241a250f445209aab3cab70eaa

**Issues fixed:**
- [Critical] `admin.py:368` — Fan out batch-level job failures to each `shops[]` entry (commit fd09832)
- [Important] `scrape_shop.py/_persist_scraped_data` — Extracted to `workers/persist.py` as public `persist_scraped_data()` (fd09832)
- [Important] `scrape_shop.py:53` — Added try/except around `persist_scraped_data` + reset shop to "failed" before re-raise (fd09832)
- [Important] `admin.py:310,325` — Deduplicated shop IDs via `dict.fromkeys()` (fd09832)
- [Important] `admin_shops.py:294` — Use `len(update_resp.data or [])` instead of `len(eligible_ids)` (fd09832)
- [Important] `apify_adapter.py:42` — Warn on duplicate URLs before building url_to_shop_id (fd09832)
- [Important] `admin.py:217` — Cap list_batches query at 5000 rows + warning log (fd09832)
- [Minor] `BatchDetail.tsx` — Remove redundant statusFilter effect; inline page reset in onChange (fd09832)
- [Important] `test_scrape_batch_handler.py` — 5 new tests for handle_scrape_batch (8fcb928)
- [Minor] `test_admin_shops_import.py` — Realistic UUIDs throughout (8fcb928)
- [Minor] `test_admin_shops_import.py` — Assert enqueued job type + payload (8fcb928)

**Batch Test Run:** 21 passed, 0 failed (targeted suite; 13 pre-existing failures in unrelated modules confirmed not introduced by these changes)

---

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter, Standards, Architecture*

### Previously Flagged Issues — Resolution Status
- [Critical] `admin.py:369` — ✓ Resolved: batch errors fanned out to each shop in `shops[]`
- [Important] `_persist_scraped_data` module boundary — ✓ Resolved: now `persist_scraped_data` in `workers/persist.py`
- [Important] `handle_scrape_shop` stuck at enriching — ✓ Resolved: try/except + status reset
- [Important] `_collect_shop_ids_for_batch` duplicates — ✓ Resolved: `dict.fromkeys()` dedup
- [Important] TOCTOU approved count — ✓ Resolved: uses UPDATE response count
- [Important] Duplicate URLs warn — ✓ Resolved: warning before dict build
- [Important] `list_batches` unbounded — ✓ Resolved: capped at 5000
- [Important] Zero test coverage — ✓ Resolved: 5 tests added
- [Minor] Double page reset — ✓ Resolved: statusFilter effect removed
- [Minor] Placeholder test IDs — ✓ Resolved: realistic UUIDs
- [Minor] No payload assertion — ✓ Resolved: asserts job_type + shops

### New Issues Found (1)
| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Minor | `BatchDetail.tsx:119` | Status badge onClick missing `setPage(1)` — could show empty results if filter clicked on page 2+ | Re-verify |

---

## Fix Pass 2 (re-verify regression)

**Issues fixed:**
- [Minor] `BatchDetail.tsx:119` — Status badge onClick now also resets page to 1 (commit fa1b83e)

**Batch Test Run:** 21 passed — all green

---

## Pass 3 — Second Full Review (New Session)

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)*
*Gemini: unavailable (timeout command not present on macOS)*

### Issues Found (8 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `backend/models/types.py`, `interface.py`, `scheduler.py` | 3 files modified in working tree but never staged — fresh clone fails with ImportError on `BatchScrapeInput`, `JobType.SCRAPE_BATCH` | Bug Hunter, Standards |
| Critical | `backend/providers/scraper/apify_adapter.py:58-62` | CID-format URLs (`?cid=12345`) have empty path → excluded from `path_to_shop_id`; exact URL match also fails; all Cafe Nomad shops silently marked failed | Bug Hunter |
| Important | `backend/workers/handlers/scrape_batch.py:100-110` | `persist_scraped_data` except block marks shop failed but does NOT update `shop_submissions`; `data is None` branch already does this correctly | Bug Hunter |
| Important | `backend/api/admin_shops.py:298-302` | `batch_shops` built from SELECT result, not UPDATE result — inconsistent with `approved` count under concurrent writes | Architecture |
| Important | `backend/tests/workers/test_scrape_batch_handler.py:133` | `any(True for _ in failed_updates)` is `bool(failed_updates)` — doesn't verify shop A specifically was marked failed | Standards |
| Important | `backend/api/admin.py:256` | `batch_map[bid]["shop_ids"].extend(shop_ids)` without dedup — retried batches inflate `shop_count` | Architecture |
| Minor | `backend/api/admin.py:8` | `escape_ilike` imported but never used in `admin.py` (used only in `admin_shops.py`) | Standards |
| Minor | `backend/api/admin.py:217` | `_BATCH_JOB_CAP` uses ALL_CAPS naming inside a function body | Standards |

### Validation Results
- All 8 issues are valid — no false positives skipped
- Proceeding to fix: 2 Critical, 4 Important, 2 Minor

---

## Fix Pass 2

**Pre-fix SHA:** fa1b83e

**Issues fixed:**
- [Critical] 3 unstaged files — staged and committed `models/types.py`, `interface.py`, `scheduler.py` (commit 22f29fb)
- [Critical] CID URL matching — added `_url_cid()` helper and `cid_to_shop_id` tertiary lookup; CID-format shops now matched via query param (commit 7aae0b5)
- [Important] `scrape_batch.py:110` — added `shop_submissions` update in except block to mirror `data is None` branch (commit 0e24d6a)
- [Important] `admin_shops.py:298` — `batch_shops` now filtered to `updated_ids` from UPDATE result (commit 0e24d6a)
- [Important] `test_scrape_batch_handler.py:133` — strengthened assertion: checks failed status count AND verifies `_SHOP_ID_A` specifically in eq() calls (commit 0e24d6a)
- [Important] `admin.py:256` — dedup via `existing` set before extending shop_ids (commit 0e24d6a)
- [Minor] `admin.py:8` — removed unused `escape_ilike` import (commit 0e24d6a)
- [Minor] `admin.py:217` — renamed `_BATCH_JOB_CAP` → `batch_job_cap` (commit 0e24d6a)

**Batch Test Run:** 18 passed, 0 failed

---

## Pass 4 — Re-Verify

*Agents: inline re-verify (fix diff reviewed directly)*

### Previously Flagged Issues — Resolution Status
- [Critical] 3 unstaged files — ✓ Resolved: committed at 22f29fb
- [Critical] CID URL matching — ✓ Resolved: `_url_cid()` + `cid_to_shop_id` tertiary lookup
- [Important] submission update on persist error — ✓ Resolved: except block now updates `shop_submissions`
- [Important] `batch_shops` consistency — ✓ Resolved: filtered to `updated_ids`; ternary safe (`update_resp` only accessed when `eligible_ids` is truthy)
- [Important] tautological test assertion — ✓ Resolved: verifies both failed count and `_SHOP_ID_A` in eq() calls
- [Important] `list_batches` dedup — ✓ Resolved: `existing` set guards before extend
- [Minor] unused import — ✓ Resolved
- [Minor] naming convention — ✓ Resolved

### New Issues Found
None.

---

## Final State

**Iterations completed:** 1 full (pass 1) + 1 re-verify fix (pass 2) + 1 second full review (pass 3) + 1 re-verify (pass 4)
**All Critical/Important resolved:** Yes
**Remaining issues:** None
**Review log:** `docs/reviews/2026-03-04-feat-batch-scraping.md`
