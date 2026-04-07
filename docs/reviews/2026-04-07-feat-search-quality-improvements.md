# Code Review Log: feat/search-quality-improvements

**Date:** 2026-04-07
**Branch:** feat/search-quality-improvements
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment*

### Issues Found (6 total)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Critical | backend/workers/persist.py:138-143 + backend/workers/handlers/classify_shop_photos.py:43-45 | Shops without photos are never enriched. `persist_scraped_data` only enqueues `CLASSIFY_SHOP_PHOTOS` when `data.photos` is non-empty. `classify_shop_photos` returns early when no unclassified photos exist. Since the old `ENRICH_SHOP` enqueue was removed from persist, shops with zero photos silently fall out of the pipeline entirely — never enriched, never embedded, stuck in "enriching" status forever. | Bug Hunter, Architecture |
| 2 | Important | backend/workers/handlers/classify_shop_photos.py:88-92 + backend/workers/handlers/enrich_shop.py:119-122 | Submission context (`submission_id`, `submitted_by`, `batch_id`) is lost in the new pipeline. `classify_shop_photos` enqueues `ENRICH_SHOP` with only `{"shop_id": shop_id}`. But `enrich_shop` forwards these fields to `GENERATE_EMBEDDING`, and downstream `publish_shop` uses them to update submission status and create activity records. Without them, submissions stay stuck in "processing" status. | Bug Hunter |
| 3 | Important | backend/workers/handlers/enrich_shop.py:62 + backend/providers/scraper/apify_adapter.py:23-29 | `google_maps_features` data is extracted by the scraper but never reaches enrichment. The features are stored in `ScrapedShopData` but `persist_scraped_data` doesn't persist them to the DB or pass them through the job payload. `classify_shop_photos` doesn't forward them either. `enrich_shop` reads `payload.get("google_maps_features", {})` which is always `{}`. Track 3 (Physical Feature Tags) is effectively dead code. | Bug Hunter, Architecture |
| 4 | Important | backend/providers/scraper/apify_adapter.py:23-29 | `_FEATURE_MAP` maps to IDs that don't match taxonomy. `"Wi-Fi"` maps to `wifi` but the taxonomy tag is `wifi_available`. `"Takeout"` maps to `takeout` and `"Dine-in"` maps to `dine_in` — neither exists in the taxonomy at all. Even when the features reach the prompt, these mismatched IDs will confuse the LLM or have no effect. | Standards, Plan Alignment |
| 5 | Minor | backend/workers/persist.py:23 | Stale docstring: `persist_scraped_data` still says "Persist scraped shop data and enqueue enrichment" but the enrichment enqueue was removed. Should say "and enqueue photo classification" or similar. | Standards |
| 6 | Minor | supabase/migrations/20260407000001_taxonomy_new_tags.sql | Inconsistent tag ID naming convention: 5 ambience tags use CJK characters as IDs (`文青`, `療癒系`, `復古工業`, `日系簡約`, `IG打卡`) while all existing tags and the other new tags use ASCII snake_case. This creates an inconsistency in the taxonomy_tags table and may complicate queries or code that assumes ASCII tag IDs. | Standards |

### Validation Results

| # | Verdict | Notes |
|---|---------|-------|
| 1 | **Valid** | Clear data flow gap. `persist.py` lines 126-143 only enqueue classify when photos exist; old enrich enqueue at lines 154-168 was removed. Shops without photos are stranded. |
| 2 | **Valid** | `classify_shop_photos.py:90` passes `{"shop_id": shop_id}` only. `enrich_shop.py:119-122` tries to forward `submission_id`/`submitted_by`/`batch_id` but they're absent. `publish_shop.py:17-18,46-76` relies on them. |
| 3 | **Valid** | Traced full data flow: scraper extracts features → persist doesn't store them → classify doesn't forward them → enrich reads empty dict from payload. No path exists for features to reach the LLM. |
| 4 | **Valid** | Checked `supabase/migrations/20260224000008_seed_taxonomy.sql`: tag is `wifi_available` not `wifi`. Searched all migrations: no `takeout` or `dine_in` tag IDs exist. |
| 5 | **Valid** | Straightforward stale documentation. |
| 6 | **Debatable** | CJK IDs are culturally appropriate for Taiwan-specific vibe tags and could be a deliberate choice for semantic clarity. But breaks the existing ASCII-only convention. Fixing anyway (lean conservative). |


**Batch Test Run:**
- `cd backend && uv run pytest` — PASS (896 passed, 27 warnings; 3 failures fixed in separate commit)

## Pass 2 — Re-Verify
*Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment*
*Agents skipped: Adversarial Review (excluded from re-verify by protocol)*

### Previously Flagged Issues — Resolution Status

- [Critical] backend/workers/persist.py:138-143 — ✓ Resolved
  else-branch at line 150 enqueues ENRICH_SHOP directly when data.photos is
  empty. Submission context (submission_id, submitted_by, batch_id) forwarded.
  Covered by test_persist_enqueues_enrich_shop_when_no_photos.

- [Important] backend/workers/handlers/classify_shop_photos.py:88-92 — ✓ Resolved
  Handler now queries shop_submissions for a processing row, extracts id and
  submitted_by, and includes them in enrich_payload. batch_id not forwarded
  (not stored in shop_submissions); acknowledged in a code comment.

- [Important] backend/workers/handlers/enrich_shop.py:62 — ✓ Resolved
  SELECT now includes google_maps_features. Value read from DB row via
  shop.get("google_maps_features") or {} instead of from payload.

- [Important] backend/providers/scraper/apify_adapter.py:23-29 — ✓ Resolved
  "Wi-Fi" remapped to "wifi_available". "Takeout" and "Dine-in" removed.

- [Minor] backend/workers/persist.py:23 — ✓ Resolved
  Docstring updated to describe both pipeline branches accurately.

- [Minor] supabase/migrations/20260407000001_taxonomy_new_tags.sql:8-12 — ✓ Resolved
  All 5 ambience tags now use ASCII snake_case IDs.

### New Issues Found (0)
None. No regressions introduced by the fixes.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-07-feat-search-quality-improvements.md
