# Code Review Log: feat/find-ui-reconstruct-design

**Date:** 2026-03-19
**Branch:** feat/find-ui-reconstruct-design
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (19 total — 8 Important, 11 Minor)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | `components/shops/directions-sheet.tsx:57-79,101-113` | AbortSignal not propagated to `fetch()` — Mapbox requests continue after sheet closes | Bug Hunter, Standards, Architecture |
| 2 | Important | `app/page.tsx:91-104` | `handleFilterApply` calls `toggleFilter` in a loop — fires N `router.push` calls, only last wins | Bug Hunter, Architecture |
| 3 | Important | `app/page.tsx:73`, `components/map/map-list-view.tsx:70-76` | `is_open: null` rendered as "Closed" — all shops show closed in list view | Bug Hunter |
| 4 | Important | `components/discovery/filter-sheet.tsx:102-103` | FilterSheet `selected` state initialised once from props, never re-synced when sheet re-opens | Architecture |
| 5 | Important | `lib/utils/mrt.ts:35` | Non-null assertion `nearest!` crashes at runtime if JSON is empty | Bug Hunter, Architecture |
| 6 | Important | `app/page.tsx:216-218` | Map view missing bottom card area and horizontal `MapMiniCard` scroll (plan deviation) | Plan Alignment |
| 7 | Important | `components/shops/directions-sheet.test.tsx:18-28` | Mocking internal pure utility `nearestMrtStation` — violates boundary-only mock rule | Test Philosophy |
| 8 | Important | `components/shops/directions-sheet.test.tsx:30-32` | Mocking internal component `ShopMapThumbnail` — violates boundary-only mock rule | Test Philosophy |
| 9 | Minor | `components/map/map-list-view.tsx:43`, `components/map/map-view.tsx:145` | Inline style objects in `.map()` render loops — new allocation per item per render | Standards, Architecture |
| 10 | Minor | `app/shops/[shopId]/[slug]/shop-detail-client.tsx:156-161` | Inline `shop={{...}}` object prop without `useMemo` — causes useCallback/useEffect churn in child | Standards |
| 11 | Minor | `lib/hooks/use-search-state.ts:32` | `view` param cast without runtime validation — `?view=foobar` leaves toggle in unselected visual state | Bug Hunter |
| 12 | Minor | `components/shops/directions-sheet.tsx:66` | Mapbox token exposed in query param (pre-existing pattern, new call site) | Bug Hunter |
| 13 | Minor | `app/page.tsx:113-142` | `viewToggleButtons` inline JSX constant in render body — recreated every render | Architecture |
| 14 | Minor | `components/map/map-view.tsx:62-76` | `CoffeePinIcon` uses `<foreignObject>` to embed Lucide icon — cross-environment risk | Architecture |
| 15 | Minor | `components/discovery/filter-sheet.tsx:17-85` | Tag taxonomy hardcoded (37 tags) — must stay in sync with backend; no comment or ADR | Architecture |
| 16 | Minor | `lib/data/taipei-mrt-stations.json` | 62 stations vs plan target of ~130 — missing full Yellow, Circular, and several branch lines | Plan Alignment |
| 17 | Minor | `components/discovery/filter-sheet.tsx:167` | Selected count badge color `#2C1810` deviates from design spec `#C8F0D8` (green) | Plan Alignment |
| 18 | Minor | `app/__tests__/find-page.test.tsx:145`, `lib/hooks/use-search-state.test.ts:25,31,37,50,81`, `components/discovery/filter-sheet.test.tsx:26,37`, `components/map/map-list-view.test.tsx:34,53` | Test names framed around implementation (function names, render state) not user actions | Test Philosophy |
| 19 | Minor | `app/__tests__/find-page.test.tsx:37` | Non-realistic test data: `id: 's1'` — other tests in same suite use UUIDs | Test Philosophy |

### Validation Results

**Skipped (false positive):**
- Issue 12 — `directions-sheet.tsx:66` Mapbox token in query param: pre-existing pattern across all map components; `NEXT_PUBLIC_` means deliberately client-public. Not a new vulnerability.

**Proceeding to fix: 18 valid/debatable issues (8 Important, 10 Minor)**

- Issue 6 (map view bottom card) noted as architectural deviation; will add persistent bottom card or TODO comment based on complexity
- Issue 15 (hardcoded taxonomy tags) — noted with inline comment, no code change needed beyond documentation
- Issue 16 (62 vs 130 MRT stations) — data gap, out of scope for this review loop; note as known limitation
- Issues 17 (badge color) — deliberate design choice using site primary color; keep as-is, add comment
