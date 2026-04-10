# Code Review Log: feat/search-bar-shop-card

**Date:** 2026-04-10
**Branch:** feat/search-bar-shop-card
**Mode:** Pre-PR
**HEAD SHA:** 714662cc4de2e8602b72fd2279e84a7c0a401bd4

## Pass 1 — Full Discovery

_Agents: Bug Hunter, Standards, Architecture & Design, Plan Alignment, Design Quality (inline review; diff was small — 529 lines / 11 code files)_

### Issues Found (6 total)

| Severity  | File:Line                                        | Description                                                                                                                                               | Flagged By     |
| --------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Critical  | components/map/map-with-fallback.tsx:99-130      | MapWithFallback never forwards onFilterClick to MapDesktopLayout / MapMobileLayout; new filter buttons are no-ops. Breaks plan acceptance criterion.      | Bug Hunter     |
| Important | components/map/map-desktop-layout.tsx:120-126    | Sidebar filter button uses raw '≡' Unicode character instead of lucide SlidersHorizontal icon (inconsistent with StickySearchBar).                        | Design Quality |
| Important | components/map/map-mobile-layout.tsx:57-64       | Mobile floating filter button also uses raw '≡'; also 40x40 touch target below 44px WCAG recommendation.                                                  | Design Quality |
| Minor     | components/map/map-mobile-layout.test.tsx:88-103 | Test defaultProps contains dead fields (count, query, onFilterToggle, view, onViewChange, onSearch, onFilterOpen) no longer on the component's interface. | Standards      |
| Minor     | components/map/map-desktop-layout.tsx:11         | const PANEL_EXPAND_DELAY_MS declaration wedged between imports. Cosmetic, pre-existing.                                                                   | Standards      |
| Minor     | app/page.test.tsx:186, 232                       | Unsafe [0]! array indexing with non-null assertion in tests; CLAUDE.md prefers first() helper. Debatable for test code.                                   | Standards      |

### Validation Results

- **Critical #1** — Validated. Confirmed by reading map-with-fallback.tsx in full: the only filter-related prop spread to MapDesktopLayout / MapMobileLayout is `onFilterOpen` (via `...layoutProps`), never `onFilterClick`. Neither layout receives `onFilterClick` at any call site. The `onFilterClick?` prop on both layouts is declared but always undefined in production. Both new filter buttons fail silently.
- **Important #2, #3** — Validated. Raw `≡` Unicode glyph used where a lucide icon is used elsewhere in the same PR. Mobile touch target marginally under 44px.
- **Minor #4** — Validated.
- **Minor #5, #6** — Debatable. Flagged but leaning no-fix without explicit user direction (pre-existing / test-only / CLAUDE.md rule scoped ambiguously for tests).

### Verification context

- `pnpm type-check` — passes (TypeScript spread does not detect the missing prop).
- `pnpm lint` — passes.
- `pnpm test` on touched files — 33/33 tests pass (9 app/page, 19 map-desktop-layout, 2 map-mobile-layout, 3 sticky-search-bar). Pre-existing React act() warnings on app/page tests.
- e2e drift — `.first()` added to both `form[role="search"]` matchers in e2e/search.spec.ts (J09, J21). Covers the dual-search-bar ambiguity introduced.

## Fix Pass 1

**Pre-fix SHA:** 714662cc4de2e8602b72fd2279e84a7c0a401bd4
**Issues fixed:**

- [Critical] components/map/map-with-fallback.tsx:99-130 — Added explicit `onFilterClick={layoutProps.onFilterOpen}` to both MapDesktopLayout and MapMobileLayout renders. Added integration tests in map-with-fallback.test.tsx verifying mobile and desktop filter buttons each call onFilterOpen once.
- [Important] components/map/map-desktop-layout.tsx:120-126 — Imported SlidersHorizontal from lucide-react; replaced `≡ 篩選` with `<SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> 篩選`; added aria-label="篩選".
- [Important] components/map/map-mobile-layout.tsx:57-64 — Replaced `≡` with `<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />`; bumped button from h-10 w-10 to h-11 w-11 (44px WCAG touch target).
- [Minor] components/map/map-mobile-layout.test.tsx:88-103 — Removed 7 stale defaultProps keys (count, query, onFilterToggle, view, onViewChange, onSearch, onFilterOpen).
- [Minor] components/map/map-desktop-layout.tsx:11 — Moved PANEL_EXPAND_DELAY_MS const to after all imports.
- [Minor] app/page.test.tsx:186,232 — Replaced unsafe [0]! with array destructuring + toBeDefined() guards.

**Batch Test Run:**

- `pnpm test` — PASS
- `cd backend && uv run pytest` — PASS

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards, Design Quality, Plan Alignment_
_Agents skipped (Minor-only): none — all agents ran_

### Previously Flagged Issues — Resolution Status

- [Critical] components/map/map-with-fallback.tsx:99-130 — ✓ Resolved
- [Important] components/map/map-desktop-layout.tsx:120-126 — ✓ Resolved
- [Important] components/map/map-mobile-layout.tsx:57-64 — ✓ Resolved
- [Minor] components/map/map-mobile-layout.test.tsx:88-103 — ✓ Resolved
- [Minor] components/map/map-desktop-layout.tsx:11 — ✓ Resolved
- [Minor] app/page.test.tsx:186,232 — ✓ Resolved

### New Issues Found (0)

No new issues introduced by the fixes.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-10-feat-search-bar-shop-card.md
