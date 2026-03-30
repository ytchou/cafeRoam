# Code Review Log: feat/dev-113-find-page-filters

**Date:** 2026-03-30
**Branch:** feat/dev-113-find-page-filters
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (15 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | app/page.tsx:61-63,69 | `.filter(Boolean)` doesn't narrow `string \| undefined` to `string` in TypeScript strict mode; `Set.has(tagId)` receives wrong type — will fail `pnpm type-check` | Bug Hunter |
| Important | app/page.tsx:68 | `new Set` constructed inside `.filter()` callback per-shop, violates CLAUDE.md "no work in loops" | Standards, Architecture |
| Important | app/page.tsx:74,79 | Hard-coded `'open_now'` and `'rating'` string literals instead of consulting `SPECIAL_FILTERS`; adding new special filter won't be enforced at compile time | Architecture |
| Important | backend/tests/api/test_shops.py:276 | `is_open_now` is an internal function, not a system boundary — should not be mocked | Standards, Test Philosophy |
| Important | app/__tests__/find-page.test.tsx:41 | `vi.mock('@/lib/hooks/use-shops')` mocks internal hook rather than HTTP boundary | Test Philosophy |
| Important | app/__tests__/find-page.test.tsx:249-258 | Missing test case for `taxonomyTags: null` — production code guards against this with `?? []` | Test Philosophy |
| Important | app/__tests__/find-page.test.tsx:260-269 | Missing test case for `isOpen: null` — production code handles with strict `=== true` check | Test Philosophy |
| Minor | backend/tests/api/test_shops.py:253 | Test description names implementation, not user outcome | Standards, Test Philosophy |
| Minor | components/filters/__tests__/filter-map.test.ts:5-25 | Test names describe internal mapping, not user behavior | Test Philosophy |
| Minor | app/__tests__/find-page.test.tsx:249,260 | Test naming violations — describe mechanism, not user action | Test Philosophy |
| Minor | lib/types/index.ts:18 | `LayoutShop.is_open` vs `Shop.isOpen` naming divergence — same concept, different casing | Architecture |
| Minor | components/filters/filter-map.ts | `FILTER_TO_TAG_IDS` typed as `Record<string, string>` instead of explicit key union; adding unknown filter keys won't error at compile time | Architecture |
| Minor | backend/api/shops.py:64 | Missing comment clarifying `TW = timezone(timedelta(hours=8))` is intentional (Taiwan has no DST) | Architecture |
| Minor | backend/tests/api/test_shops.py:84 | Placeholder test data (`"shop-1"`, `"Test Cafe"`) instead of realistic values | Test Philosophy |
| Minor | backend/tests/api/test_shops.py:55-68 | Test names describe endpoint permission mechanics, not user outcomes | Test Philosophy |

### Validation Results

| # | Severity | Classification | Reason |
|---|----------|----------------|--------|
| 1 | Critical | **Incorrect** | `FILTER_TO_TAG_IDS` is `Record<string, string>` — indexing returns `string`, not `string \| undefined`; `noUncheckedIndexedAccess` absent from tsconfig; no type error |
| 2 | Important | **Valid** | `new Set` in loop violates CLAUDE.md "No work in loops" |
| 3 | Important | **Valid** | Hard-coded `'open_now'`/`'rating'` strings create coupling gap with `SPECIAL_FILTERS` |
| 4 | Important | **Debatable** | `is_open_now` is internal but pure; mocking it is pragmatic but violates CLAUDE.md "mock at boundaries only" |
| 5 | Important | **Incorrect** | `use-shops` wraps SWR + HTTP fetch — this IS the system boundary; mock is correct |
| 6 | Important | **Incorrect** | `taxonomyTags` is typed as required `TaxonomyTag[]` — null unreachable via type contract |
| 7 | Important | **Valid** | `isOpen: null` is a real production scenario (no opening hours); not tested despite strict `=== true` guard |
| 8 | Minor | **Valid** | Test description names data fields, not user outcomes |
| 9 | Minor | **Valid** | Test names describe internal mapping, not user behavior |
| 10 | Minor | **Valid** | Test names describe filter mechanics, not user actions |
| 11 | Minor | **Debatable** | `LayoutShop` carries both snake/camel variants intentionally; messy but by design |
| 12 | Minor | **Debatable** | `Record<string, string>` functional given tsconfig; explicit union would improve exhaustiveness |
| 13 | Minor | **Debatable** | `TW = timezone(timedelta(hours=8))` self-explanatory but DST comment adds clarity |
| 14 | Minor | **Valid** | `"shop-1"`, `"Test Cafe"` are placeholder values violating CLAUDE.md realistic-data rule |
| 15 | Minor | **Debatable** | Auth "is_public" tests describe permissions which IS the user-relevant behavior; borderline |

**Proceeding to fix all Valid + Debatable issues (12 total, 0 Critical, 4 Important, 8 Minor)**
