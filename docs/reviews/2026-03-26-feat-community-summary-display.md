# Code Review Log: feat/community-summary-display

**Date:** 2026-03-26
**Branch:** feat/community-summary-display
**Mode:** Pre-PR
**HEAD SHA:** f232b70474902d9543b2b084414f0b15d6c2d94b

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (8 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `backend/api/shops.py:27-32` | `community_summary` missing from `_SHOP_LIST_COLUMNS`; snippet broken on browse/map path | Bug Hunter, Standards, Architecture, Plan Alignment |
| Important | `lib/types/index.ts:~73` (LayoutShop) | `communitySummary` not in `LayoutShop`; field silently dropped for map layout consumers | Bug Hunter, Architecture, Standards |
| Important | `backend/tests/api/test_search.py` (not modified) | No test coverage for `community_summary` in search results; design doc explicitly required this | Plan Alignment |
| Important | `app/shops/[shopId]/[slug]/shop-detail-client.test.tsx:62-64` | `CommunitySummary` mocked as internal component (not a system boundary) | Architecture, Test Philosophy |
| Minor | `components/shops/shop-card-compact.tsx:87` | CSS `truncate` conflicts with JS `truncateSnippet()` — risks clipping `」` bracket | Bug Hunter |
| Minor | `components/shops/shop-card-compact.tsx:84-91` | IIFE in JSX render body — overly complex, prefer named variable | Standards, Architecture |
| Minor | `backend/tests/api/test_shops.py:84` | Placeholder test data `{"id": "shop-1", "name": "Test Cafe"}` instead of realistic fixture | Test Philosophy |
| Minor | `components/shops/community-summary.tsx:14-16` | Tooltip span deviates from plan spec (legitimate TS fix — `title` not valid SVG prop) | Plan Alignment |

### Validation Results

| # | Severity | Classification | Reasoning |
|---|----------|---------------|-----------|
| 1 | Critical | **Valid** | `community_summary` genuinely absent from `_SHOP_LIST_COLUMNS`; browse/map path broken |
| 2 | Important | **Incorrect** | `LayoutShop` is not used by `ShopCardCompact`; `CompactShop` is a separate inline interface; no silent drop |
| 3 | Important | **Valid** | No test coverage for `community_summary` in search results; real gap |
| 4 | Important | **Incorrect** | Mock follows established pattern for all 8+ child components in this test file; rule applied inconsistently |
| 5 | Minor | **Valid** | CSS `truncate` can clip the `」` bracket after JS already added it; real visual defect |
| 6 | Minor | **Debatable** | IIFE works correctly; named variable pre-`return` is cleaner but opinionated |
| 7 | Minor | **Incorrect** | Pre-existing unmodified test checking only status 200; PR added realistic fixtures elsewhere |
| 8 | Minor | **Incorrect** | Intentional TypeScript fix; design doc does not exist in repo; reviewers acknowledged it as legitimate |

**Issues to fix:** #1 (Critical), #3 (Important), #5 (Minor), #6 (Debatable/Minor)
**Skipped (false positives):** #2, #4, #7, #8

## Fix Pass 1

**Pre-fix SHA:** f232b70474902d9543b2b084414f0b15d6c2d94b
**Post-fix SHA:** ded14234b1c8f7898a766251478ccb104fad3687

**Issues fixed:**
- [Critical] `backend/api/shops.py:27-32` — Moved `community_summary` to `_SHOP_LIST_COLUMNS`; inherited by `_SHOP_DETAIL_COLUMNS` via f-string
- [Important] `backend/tests/api/test_search.py` — Added `test_search_results_include_community_summary` with realistic Taiwanese shop data
- [Minor] `components/shops/shop-card-compact.tsx:87` — Removed CSS `truncate` class; `truncateSnippet()` is now sole truncation mechanism
- [Minor] `components/shops/shop-card-compact.tsx:84-91` — Replaced IIFE with named `summary` variable; clean `{summary && ...}` conditional

**Batch Test Run:**
- `pnpm test` (vitest) — PASS (893 tests)
- `cd backend && uv run pytest` — PASS (584 tests)

## Pass 2 — Re-Verify (Smart Routing)

*Agents re-run: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Critical] `backend/api/shops.py:27-32` — ✓ Resolved
- [Important] `backend/tests/api/test_search.py` — ✓ Resolved
- [Minor] `components/shops/shop-card-compact.tsx:87` — ✓ Resolved
- [Minor] `components/shops/shop-card-compact.tsx:84-91` — ✓ Resolved

### New Issues Found
None. No regressions introduced.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-26-feat-community-summary-display.md
