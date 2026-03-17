# Code Review Log: feat/vibe-tags

**Date:** 2026-03-17
**Branch:** feat/vibe-tags
**Mode:** Pre-PR
**HEAD SHA (at review start):** e16420a439f905461ed4647c9531194e02dc2b35

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (16 total, after dedup)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | vibe_service.py:69 | Falsy coordinate check silently drops distance when lat/lng = 0.0 | Bug Hunter |
| 2 | Important | vibe_service.py:104–113 | No `.limit()` on shop_tags query — Supabase default cap (1000) silently truncates | Bug Hunter |
| 3 | Important | vibe_service.py:5,101 | `HTTPException` imported/raised in service layer — breaks service/HTTP separation | Standards, Architecture |
| 4 | Important | vibe_service.py + tarot_service.py | `_haversine` + `_EARTH_RADIUS_KM` + bounding-box math duplicated between two services | Architecture |
| 5 | Important | vibe_service.py:84 + vibes/[slug]/page.tsx | `matched_tag_labels` always hardcoded `[]`; design shows tag chips; never rendered in UI | Plan Alignment |
| 6 | Important | app/explore/page.tsx:126 | "See all" link points to `/explore/vibes` — no page exists, will 404 in production | Plan Alignment |
| 7 | Important | app/explore/page.test.tsx | Mock violation: `useVibes`, `useTarotDraw`, `useGeolocation` mocked as internal modules | Test Philosophy |
| 8 | Important | app/explore/vibes/[slug]/page.test.tsx | Mock violation: `useVibeShops`, `useGeolocation` mocked as internal modules | Test Philosophy |
| 9 | Minor | vibe_service.py:89 | `total_count` is misleading — reflects pre-cap count, UI shows "N shops found" but only 50 returned | Bug Hunter, Architecture |
| 10 | Minor | vibe_service.py:102 | Unsafe `rows[0]` — project standard requires `first()` helper from `core.db` | Bug Hunter, Standards |
| 11 | Minor | lib/api/vibes.ts:8–19 | `radius_km` appended to URL even when no geo params provided — unnecessary cache-key variance | Bug Hunter |
| 12 | Minor | lib/hooks/use-vibe-shops.ts | No SWR key guard for undefined slug — fires request to `/api/.../undefined/shops` | Bug Hunter |
| 13 | Minor | app/explore/vibes/[slug]/page.tsx:66, app/explore/page.tsx:121 | Inline style objects without `useMemo` violate CLAUDE.md performance standard | Standards |
| 14 | Minor | lib/hooks/use-vibe-shops.ts | Double-fires before geo settles: no-geo request + geo request when location granted | Architecture |
| 15 | Minor | app/explore/vibes/[slug]/page.test.tsx | Missing 2 required test cases: empty state, distance badge; loading skeleton test is a no-op | Plan Alignment |
| 16 | Minor | app/explore/vibes/[slug]/page.test.tsx:43 | Loading test only asserts `<main>` exists — name claims skeleton test but never renders skeletons | Test Philosophy |

### Validation Results

- All 16 issues confirmed valid or debatable (fix both per skill policy).
- No false positives found.
- All 16 proceeding to fix.

## Fix Pass 1

**Pre-fix SHA:** e16420a439f905461ed4647c9531194e02dc2b35

**Issues fixed:**
- [Important] vibe_service.py:69 — Changed `row.get("latitude")` truthiness check to `is not None` to handle lat/lng == 0.0
- [Important] vibe_service.py:104–113 — Refactored `_fetch_matching_shop_ids` to return `dict[str, list[str]]` with `.limit(10000)` and `shop_id, tag_id` select; also enables matched_tag_labels population
- [Important] vibe_service.py:5,101 — Replaced `HTTPException` with `ValueError`; added try/except in `explore.py` route handler
- [Important] vibe_service.py + tarot_service.py — Extracted `haversine()` + `bounding_box()` to `backend/core/geo.py`; both services now import from there
- [Important] vibe_service.py:84 — `matched_tag_labels` now populated from matched tag IDs instead of `[]`
- [Important] app/explore/page.tsx:126 — Removed "See all" Link pointing to non-existent `/explore/vibes` route
- [Important] app/explore/page.test.tsx — Removed `vi.mock('@/lib/hooks/use-vibes')` internal hook mock; configured SWR boundary mock to return vibes data for `/api/explore/vibes` key
- [Important] app/explore/vibes/[slug]/page.test.tsx — Removed `vi.mock('@/lib/hooks/use-vibe-shops')` internal hook mock; added proper SWR boundary mock infrastructure
- [Minor] vibe_service.py:89 — Capped `total_count` to `len(returned)` so displayed count is accurate
- [Minor] vibe_service.py:102 — Replaced `rows[0]` with `first(rows, ...)` from core.db
- [Minor] lib/api/vibes.ts:8–19 — `radius_km` only appended to URL when lat+lng are both present
- [Minor] lib/hooks/use-vibe-shops.ts — Added undefined slug guard (SWR key → null when slug missing); added geoLoading guard to prevent double-fetch
- [Minor] app/explore/vibes/[slug]/page.tsx:66, app/explore/page.tsx:121 — Extracted inline style objects to module-level BRICOLAGE_STYLE constants
- [Minor] app/explore/vibes/[slug]/page.test.tsx — Fixed loading skeleton test (now asserts .animate-pulse); added empty state test; added distance badge test
- [Minor] backend/tests/services/test_vibe_service.py — Updated test to expect ValueError instead of HTTPException (consequence of service layer fix)

**Batch Test Run:**
- `pnpm test` — PASS (4 pre-existing MapView/Mapbox failures, not introduced by this branch)
- `pytest tests/services/test_vibe_service.py tests/api/test_explore.py` — PASS (25/25)

## Pass 2 — Re-Verify (Smart Routing)

*Agents re-run: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy (all were active)*
*Agents skipped (Minor-only): none*

### Previously Flagged Issues — Resolution Status

| # | Issue | Status |
|---|-------|--------|
| 1 | Falsy coordinate check | ✓ Resolved |
| 2 | shop_tags row limit | ✓ Resolved |
| 3 | HTTPException in service layer | ✓ Resolved |
| 4 | Haversine duplication | ✓ Resolved (core/geo.py created) |
| 5 | matchedTagLabels always empty | ✓ Resolved |
| 6 | "See all" link 404 | ✓ Resolved |
| 7 | page.test.tsx mock violation | ✓ Resolved (SWR boundary mock) |
| 8 | [slug]/page.test.tsx mock violation | ✓ Resolved (SWR boundary mock) |
| 9 | total_count misleading | ✓ Resolved (capped to returned count) |
| 10 | rows[0] unsafe access | ✓ Resolved (first() helper) |
| 11 | radius_km always appended | ✓ Resolved |
| 12 | undefined slug SWR guard | ✓ Resolved |
| 13 | Inline style objects | ✓ Resolved (module-level consts) |
| 14 | Double-fire before geo | ✓ Resolved (geoLoading guard) |
| 15 | Missing test cases | ✓ Resolved (added 2 tests) |
| 16 | Loading skeleton no-op | ✓ Resolved (.animate-pulse assertion) |

### New Issues Found: 0

No Critical or Important issues remain. Early exit.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None
**Review log:** docs/reviews/2026-03-17-feat-vibe-tags.md
