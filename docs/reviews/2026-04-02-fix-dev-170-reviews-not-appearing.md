# Code Review Log: fix/dev-170-reviews-not-appearing

**Date:** 2026-04-02
**Branch:** fix/dev-170-reviews-not-appearing
**Mode:** Pre-PR

## Pass 1 — Discovery

*Agents: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy, Design Quality (all inline due to rate limit)*

### Issues Found (1 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Important | backend/api/shops.py:221-232 | Private check-in reviews exposed via admin DB — query needs `is_public=True` filter | Bug Hunter, Architecture |

### Validation Results

- **Valid**: backend/api/shops.py:221-232 — confirmed: admin DB bypasses RLS, private check-ins would be exposed without explicit filter

## Fix Pass 1

**Pre-fix SHA:** 01c7d5cefbf38b3378f3b7f373dcad0709a155e9

**Issues fixed:**
- [Important] backend/api/shops.py:228 — Added `.eq("is_public", True)` filter to reviews query
- [Important] backend/tests/api/test_shop_reviews.py — Updated mock chains to include extra `.eq()` call

**Batch Test Run:**
- `pnpm vitest run` — 1066 PASS, 6 FAIL (all 6 pre-existing on main, 0 from our changes)
- `cd backend && uv run pytest` — 764 PASS, 0 FAIL

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Commits:**
1. `01c7d5c` — fix(DEV-170): reviews not appearing on shop detail page
2. `2954f33` — fix(review): filter reviews to public check-ins only
