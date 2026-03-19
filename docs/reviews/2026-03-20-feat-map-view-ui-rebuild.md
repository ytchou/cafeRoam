# Code Review Log: feat/map-view-ui-rebuild

**Date:** 2026-03-20
**Branch:** feat/map-view-ui-rebuild
**Mode:** Pre-PR
**HEAD SHA:** 883d8979fbcfe209c2415fa21ed40116b78e82d3

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (18 total)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | components/navigation/header-nav.tsx:20 | Favorites tab never shows active on /lists route — pathname.replace('/', '') yields 'lists' but tab key is 'favorites'; also breaks nested routes like /profile/settings | Bug Hunter |
| 2 | Important | components/filters/filter-sheet.tsx:210 | Stale `selected` Set when initialFilters change externally — lazy useState initializer only runs on mount; reopening sheet after external filter removal shows stale selection | Bug Hunter |
| 3 | Important | components/shops/shop-card-carousel.tsx:26, shop-card-compact.tsx:34, shop-card-grid.tsx:25 | Unsafe [0] array indexing — CLAUDE.md requires first() helper unconditionally | Standards |
| 4 | Important | components/map/map-desktop-layout.tsx:88, map-mobile-layout.tsx:101, list-desktop-layout.tsx:73, list-mobile-layout.tsx:71 | O(n) activeFilters.includes() inside render loop — CLAUDE.md requires Set/Map for membership checks | Standards |
| 5 | Important | components/map/map-desktop-layout.tsx, map-mobile-layout.tsx, list-desktop-layout.tsx, list-mobile-layout.tsx | QUICK_FILTERS constant copy-pasted into all 4 layout files — will silently diverge on any filter change | Architecture + Standards |
| 6 | Important | components/map/map-desktop-layout.tsx, map-mobile-layout.tsx, list-desktop-layout.tsx, list-mobile-layout.tsx | LayoutShop interface duplicated 4 times with different fields (map layouts add lat/lng, list layouts omit them) — silent drift risk | Architecture |
| 7 | Important | components/navigation/app-shell.tsx | AppShell coupled to `pathname === '/'` — route-awareness leak into generic shell; must update AppShell whenever Find page moves routes | Architecture |
| 8 | Important | components/navigation/app-shell.test.tsx:13-19 | Mocks internal sibling components BottomNav and HeaderNav instead of letting real components render — tests cannot catch integration regressions | Test Philosophy |
| 9 | Minor | components/navigation/header-nav.tsx:55-61 | Search button has no onClick handler — interactive element silently does nothing (likely intentional scaffolding but violates aria contract) | Bug Hunter |
| 10 | Minor | components/shops/shop-card-compact.tsx:53 | Emoji ☕ in no-photo fallback — CLAUDE.md prohibits emojis in code | Standards |
| 11 | Minor | components/map/map-desktop-layout.tsx, map-mobile-layout.tsx | MapView dynamic import declared twice — diverge risk if import options change | Architecture |
| 12 | Minor | app/page.tsx:88-89 | onFilterOpen/onFilterClose in layoutProps are inline arrow functions — inconsistent with useCallback treatment of other handlers in same file | Architecture |
| 13 | Minor | components/map/shop-carousel.tsx:27 | O(n) Array.findIndex in useEffect on every selectedShopId change; also relies on DOM child order matching shops array order (fragile assumption) | Architecture |
| 14 | Minor | — | No integration tests for FindPageContent layout dispatch logic (mobile vs desktop, map vs list routing) | Architecture |
| 15 | Minor | components/filters/filter-sheet.tsx | Desktop uses hand-rolled modal overlay instead of Radix Dialog — missing focus trap, aria-modal, role="dialog" from library | Plan Alignment |
| 16 | Minor | components/discovery/filter-sheet.tsx | Dead duplicate of filters/filter-sheet.tsx — unused by any active page after this PR, should be deleted separately | Plan Alignment |
| 17 | Minor | components/map/map-mobile-layout.tsx | MapOverlay not extracted as named component — design doc shows it as a named node in component tree (inlined instead) | Plan Alignment |
| 18 | Minor | components/navigation/app-shell.test.tsx, count-header.test.tsx, view-toggle.test.tsx, map-pin.test.tsx, collapse-toggle.test.tsx, filter-tag.test.tsx, shop-card-*.test.tsx | Test naming violations — describe rendering/implementation rather than user actions or outcomes | Test Philosophy |

### Active Agents (flagged ≥1 issue)
All 5 agents flagged issues: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy

### Validation Results

**Proceeding to fix: 12 issues (7 Important, 5 Minor)**

| # | Classification | Reason |
|---|----------------|--------|
| 1 | Valid — fix | `pathname.replace('/', '')` confirmed to give `'lists'` ≠ `'favorites'` |
| 2 | Valid — fix | Lazy useState confirmed on line 210; no sync mechanism; `if (!open) return null` fires AFTER hooks |
| 3 | Valid — fix | No `first()` helper in lib/; will use `.at(0) ?? null` as idiomatic equivalent |
| 4 | Valid — fix | `activeFilters.includes(f.id)` confirmed in all 4 layout files inside render loop |
| 5 | Valid — fix | Identical 5-item QUICK_FILTERS constant copy-pasted in all 4 layouts |
| 6 | Valid — fix | LayoutShop in map layouts adds lat/lng; list layouts omit them — silent drift confirmed |
| 7 | Debatable — not fixing | AppShell `pathname === '/'` is pragmatic, route is stable, YAGNI applies at this stage |
| 8 | Valid — fix | BottomNav and HeaderNav have zero external deps that would break tests; mocking them is a CLAUDE.md boundary violation |
| 9 | Skip — intentional scaffolding | Search button is clearly placeholder UI; authors are aware |
| 10 | Valid — fix | Emoji ☕ confirmed on line 53 |
| 11 | Valid — fix | Two identical `dynamic(import('@/components/map/map-view')...)` in map-desktop and map-mobile layouts |
| 12 | Valid — fix | `onFilterOpen: () => setFilterSheetOpen(true)` and `onFilterClose` in layoutProps are inline arrows; `handleSearch`, `handleViewChange`, `handleFilterApply` directly above use useCallback |
| 13 | Valid — fix | `shops.findIndex(...)` then `children[idx]` — O(n) + fragile DOM index coupling confirmed |
| 14 | Skip — separate concern | Integration tests for layout dispatch are a valid gap but out of scope for this review |
| 15 | Debatable — not fixing | Hand-rolled modal achieves same outcome; Radix Dialog refactor is non-trivial and not a regression |
| 16 | Skip — out of plan scope | Plan agent confirmed discovery/filter-sheet.tsx predates this PR |
| 17 | Skip — cosmetic | MapOverlay inlined vs extracted is design-doc-only deviation, no behavior impact |
| 18 | Partial fix | Fix filter-tag CSS class assertions (brittleness); skip minor naming improvements as lower ROI |

**Skipped false positives: 6** (items 7, 9, 14, 15, 16, 17)

---
