# Code Review Log: feat/dev-113-find-page-filters

**Date:** 2026-03-30
**Branch:** feat/dev-113-find-page-filters
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (15 total)

| Severity  | File:Line                                            | Description                                                                                                                                                       | Flagged By                 |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Critical  | app/page.tsx:61-63,69                                | `.filter(Boolean)` doesn't narrow `string \| undefined` to `string` in TypeScript strict mode; `Set.has(tagId)` receives wrong type — will fail `pnpm type-check` | Bug Hunter                 |
| Important | app/page.tsx:68                                      | `new Set` constructed inside `.filter()` callback per-shop, violates CLAUDE.md "no work in loops"                                                                 | Standards, Architecture    |
| Important | app/page.tsx:74,79                                   | Hard-coded `'open_now'` and `'rating'` string literals instead of consulting `SPECIAL_FILTERS`; adding new special filter won't be enforced at compile time       | Architecture               |
| Important | backend/tests/api/test_shops.py:276                  | `is_open_now` is an internal function, not a system boundary — should not be mocked                                                                               | Standards, Test Philosophy |
| Important | app/**tests**/find-page.test.tsx:41                  | `vi.mock('@/lib/hooks/use-shops')` mocks internal hook rather than HTTP boundary                                                                                  | Test Philosophy            |
| Important | app/**tests**/find-page.test.tsx:249-258             | Missing test case for `taxonomyTags: null` — production code guards against this with `?? []`                                                                     | Test Philosophy            |
| Important | app/**tests**/find-page.test.tsx:260-269             | Missing test case for `isOpen: null` — production code handles with strict `=== true` check                                                                       | Test Philosophy            |
| Minor     | backend/tests/api/test_shops.py:253                  | Test description names implementation, not user outcome                                                                                                           | Standards, Test Philosophy |
| Minor     | components/filters/**tests**/filter-map.test.ts:5-25 | Test names describe internal mapping, not user behavior                                                                                                           | Test Philosophy            |
| Minor     | app/**tests**/find-page.test.tsx:249,260             | Test naming violations — describe mechanism, not user action                                                                                                      | Test Philosophy            |
| Minor     | lib/types/index.ts:18                                | `LayoutShop.is_open` vs `Shop.isOpen` naming divergence — same concept, different casing                                                                          | Architecture               |
| Minor     | components/filters/filter-map.ts                     | `FILTER_TO_TAG_IDS` typed as `Record<string, string>` instead of explicit key union; adding unknown filter keys won't error at compile time                       | Architecture               |
| Minor     | backend/api/shops.py:64                              | Missing comment clarifying `TW = timezone(timedelta(hours=8))` is intentional (Taiwan has no DST)                                                                 | Architecture               |
| Minor     | backend/tests/api/test_shops.py:84                   | Placeholder test data (`"shop-1"`, `"Test Cafe"`) instead of realistic values                                                                                     | Test Philosophy            |
| Minor     | backend/tests/api/test_shops.py:55-68                | Test names describe endpoint permission mechanics, not user outcomes                                                                                              | Test Philosophy            |

### Validation Results

| #   | Severity  | Classification | Reason                                                                                                                                                                 |
| --- | --------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Critical  | **Incorrect**  | `FILTER_TO_TAG_IDS` is `Record<string, string>` — indexing returns `string`, not `string \| undefined`; `noUncheckedIndexedAccess` absent from tsconfig; no type error |
| 2   | Important | **Valid**      | `new Set` in loop violates CLAUDE.md "No work in loops"                                                                                                                |
| 3   | Important | **Valid**      | Hard-coded `'open_now'`/`'rating'` strings create coupling gap with `SPECIAL_FILTERS`                                                                                  |
| 4   | Important | **Debatable**  | `is_open_now` is internal but pure; mocking it is pragmatic but violates CLAUDE.md "mock at boundaries only"                                                           |
| 5   | Important | **Incorrect**  | `use-shops` wraps SWR + HTTP fetch — this IS the system boundary; mock is correct                                                                                      |
| 6   | Important | **Incorrect**  | `taxonomyTags` is typed as required `TaxonomyTag[]` — null unreachable via type contract                                                                               |
| 7   | Important | **Valid**      | `isOpen: null` is a real production scenario (no opening hours); not tested despite strict `=== true` guard                                                            |
| 8   | Minor     | **Valid**      | Test description names data fields, not user outcomes                                                                                                                  |
| 9   | Minor     | **Valid**      | Test names describe internal mapping, not user behavior                                                                                                                |
| 10  | Minor     | **Valid**      | Test names describe filter mechanics, not user actions                                                                                                                 |
| 11  | Minor     | **Debatable**  | `LayoutShop` carries both snake/camel variants intentionally; messy but by design                                                                                      |
| 12  | Minor     | **Debatable**  | `Record<string, string>` functional given tsconfig; explicit union would improve exhaustiveness                                                                        |
| 13  | Minor     | **Debatable**  | `TW = timezone(timedelta(hours=8))` self-explanatory but DST comment adds clarity                                                                                      |
| 14  | Minor     | **Valid**      | `"shop-1"`, `"Test Cafe"` are placeholder values violating CLAUDE.md realistic-data rule                                                                               |
| 15  | Minor     | **Debatable**  | Auth "is_public" tests describe permissions which IS the user-relevant behavior; borderline                                                                            |

**Proceeding to fix all Valid + Debatable issues (12 total, 0 Critical, 4 Important, 8 Minor)**

---

## Fix Pass 1

**Pre-fix SHA:** `371c9d9067be468f66143891c3f6818f7478482f`

**Issues fixed:**

- [Important] `app/page.tsx:68` — Precomputed `shopTagSets` Map before filter loop to hoist Set construction out of per-shop callback
- [Important] `app/page.tsx:74,79` — Replaced `filters.includes('open_now'/'rating')` with `activeFiltersSet.has()`; derived tagFilters via type predicate `f in FILTER_TO_TAG_IDS` instead of hard-coded exclusion
- [Important] `backend/tests/api/test_shops.py:276` — Removed `patch("api.shops.is_open_now")`; replaced with "Open 24 hours" for all weekdays so real `is_open_now` returns True deterministically
- [Important] `app/__tests__/find-page.test.tsx:260-269` — Added `isOpen: null` shop to global fixture; updated open_now test to assert null-status shop is excluded
- [Minor] `components/filters/filter-map.ts` — Extracted `TagFilterId` union type; typed `FILTER_TO_TAG_IDS` as `Record<TagFilterId, string>` for exhaustiveness
- [Minor] `backend/api/shops.py:19` — Added `# Taiwan UTC+8, no DST — zoneinfo not required` comment to `TW` constant
- [Minor] `components/filters/__tests__/filter-map.test.ts:5-25` — Renamed all 5 tests to user-journey framing
- [Minor] `app/__tests__/find-page.test.tsx:249,260` — Renamed to "shows only shops with WiFi when wifi filter is selected" and "filters... excludes isOpen: false and isOpen: null"
- [Minor] `backend/tests/api/test_shops.py:253` — Updated docstring to user-journey framing
- [Minor] `backend/tests/api/test_shops.py:55,70` — Updated auth test docstrings to user-journey framing
- [Minor] `backend/tests/api/test_shops.py:84` — Replaced `"shop-1"` / `"Test Cafe"` with realistic UUID and `"山小孩咖啡"` values
- [Minor] `lib/types/index.ts:125` — Added comment explaining `LayoutShop` intentional dual snake/camel format

**Issues skipped (false positives):**

- `app/page.tsx:61-63` — No type error: `Record<TagFilterId, string>` indexing returns `string` (post-fix, `TagFilterId` union prevents unknown keys)
- `app/__tests__/find-page.test.tsx:41` — `vi.mock('@/lib/hooks/use-shops')` correctly mocks at the SWR/HTTP boundary
- `app/__tests__/find-page.test.tsx:249-258` — `taxonomyTags: TaxonomyTag[]` is required non-nullable; null not reachable

**Batch Test Run:**

- `pnpm test` (vitest run) — PASS (1043 passed; 2 pre-existing failures in `generateShopFaq.test.ts`)
- `cd backend && uv run pytest` — PASS (723 passed, 7 warnings)

---

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Test Philosophy (Sonnet)_
_Agents skipped (no findings): Plan Alignment_

### Previously Flagged Issues — Resolution Status

- [Critical] `app/page.tsx:61-63` — ✓ Correctly Incorrect (no type error; fix improved type-safety anyway)
- [Important] `app/page.tsx:68` — ✓ Resolved: `shopTagSets` Map pre-computed before filter loop
- [Important] `app/page.tsx:74,79` — ✓ Resolved: `activeFiltersSet.has()` for O(1); tagFilters derived via `TagFilterId` predicate
- [Important] `backend/tests/api/test_shops.py:276` — ✓ Resolved: real `is_open_now` used with deterministic all-day "Open 24 hours" data
- [Important] `app/__tests__/find-page.test.tsx:41` — ✓ Correctly Incorrect: `use-shops` IS the HTTP boundary
- [Important] `app/__tests__/find-page.test.tsx:249-258` — ✓ Correctly Incorrect: `taxonomyTags` is required non-nullable
- [Important] `app/__tests__/find-page.test.tsx:260-269` — ✓ Resolved: `isOpen: null` shop in fixture + assertion
- [Minor] All Minor issues — ✓ Resolved

### New Issues Found (1)

| Severity | File:Line               | Description                                                                                                                      | Flagged By   |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Minor    | `filter-map.test.ts:22` | `as string` per-property cast introduced by `TagFilterId` tightening; `Record<string, string>` cast at variable level is cleaner | Architecture |

→ Fixed in follow-up commit `f77cf137b2601931cd8e257d111400e0c4e43e82`

---

## Final State

**Iterations completed:** 1 (+ minor regression cleanup)
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** `docs/reviews/2026-03-30-feat-dev-113-find-page-filters.md`
