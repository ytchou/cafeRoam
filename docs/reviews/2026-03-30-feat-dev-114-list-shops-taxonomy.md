# Code Review Log: feat/dev-114-list-shops-taxonomy

**Date:** 2026-03-30
**Branch:** feat/dev-114-list-shops-taxonomy
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (8 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | `backend/api/shops.py:41` | `opening_hours` duplicated in `_SHOP_DETAIL_COLUMNS` after being added to `_SHOP_LIST_COLUMNS` | Bug Hunter, Standards, Architecture |
| Important | `backend/api/shops.py:76-80` | Raw `openingHours` leaks into list response; `opening_hours` not popped before camel transform | Bug Hunter, Architecture, Plan Alignment |
| Important | `backend/core/opening_hours.py:108` | `is_open_now` returns `False` (not `None`) when today's weekday is absent from non-empty hours list | Bug Hunter |
| Important | `backend/api/shops.py:71-75,120-124` | Taxonomy tag transform logic duplicated between `list_shops` and `get_shop`; extract `_transform_taxonomy_tags()` | Architecture |
| Minor | `backend/api/shops.py:13` | `_TW` constant inserted mid-import block | Standards, Architecture |
| Minor | `backend/tests/api/test_shops.py:266` | `isOpen` presence asserted but not value; non-deterministic (no time mock) | Architecture |
| Minor | `backend/tests/api/test_shops.py:288-291` | Featured-shops test fixture missing `shop_tags`, `shop_claims`, `shop_photos` | Standards, Architecture |
| Minor | `backend/tests/api/test_shops.py:303` | `chain.eq.assert_any_call` tests implementation not behavior (debatable — only signal available) | Test Philosophy |

### Validation Results

All 8 issues confirmed valid. Issue H (debatable) — proceeding conservatively.

## Fix Pass 1

**Pre-fix SHA:** `821cc183885860b1df7000e8625d99d3b5a205db`

**Issues fixed:**
- [Important] `backend/api/shops.py:41` — Removed duplicate `opening_hours` from `_SHOP_DETAIL_COLUMNS`
- [Important] `backend/api/shops.py:76` — Pop `opening_hours` before camel transform; no longer leaked as `openingHours` in list response
- [Important] `backend/core/opening_hours.py:108` — `is_open_now` now returns `None` (not `False`) when today's weekday is absent from a non-empty hours list; midnight-crossing prev_day entries correctly set `today_seen`
- [Important] `backend/api/shops.py:71-75,120-124` — Extracted `_transform_taxonomy_tags()` helper; both `list_shops` and `get_shop` use it
- [Minor] `backend/api/shops.py:13` — Moved `_TW` constant to after all imports
- [Minor] `backend/tests/api/test_shops.py:266` — Patched `api.shops.datetime` to return fixed Monday 10 AM; `isOpen is True` assertion
- [Minor] `backend/tests/api/test_shops.py:288-291` — Updated fixture to include `shop_tags`, `shop_claims`, `shop_photos`
- [Minor] `backend/tests/services/test_tarot_service.py` — Fixed `test_filters_out_closed_shops` to use explicit "Wednesday: Closed"; added `test_includes_shop_with_unlisted_day_hours`

**Issues skipped:**
- [Minor H] `chain.eq.assert_any_call` — debatable, only signal available with canned-data mocks

**Batch Test Run:**
- `cd backend && uv run pytest` — PASS (725/725)

## Pass 2 — Re-Verify

*Agents re-run: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Important A] `_SHOP_DETAIL_COLUMNS` duplicate — ✓ Resolved
- [Important B] `openingHours` leaked in list response — ✓ Resolved
- [Important C] `is_open_now` false/null for missing weekday — ✓ Resolved
- [Important D] Tag transform duplication — ✓ Resolved
- [Minor E] `_TW` mid-import — ✓ Resolved
- [Minor F] Non-deterministic `isOpen` assertion — ✓ Resolved
- [Minor G] Incomplete fixture — ✓ Resolved
- [Minor H] `chain.eq` tests implementation — Debatable, skipped

### New Issues Found
None — no regressions from the fix pass.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**
- [Minor H] `chain.eq.assert_any_call` — debatable, not blocking

**Review log:** `docs/reviews/2026-03-30-feat-dev-114-list-shops-taxonomy.md`
