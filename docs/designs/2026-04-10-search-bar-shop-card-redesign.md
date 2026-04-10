# Main Page Search Bar & Shop Card Redesign

**Date:** 2026-04-10
**Tickets:** DEV-302, DEV-303
**Hat:** CTO
**Status:** Approved

## Context

Manual QA on desktop (1512×823) surfaced two overlapping UX issues on the main page (`/`):

1. **Dual search bar (DEV-302):** The hero section renders `components/discovery/search-bar.tsx` while the map area also renders `components/filters/search-bar.tsx` (desktop: top of sidebar; mobile: `absolute top-4` overlay). Both inputs sync to the same `?q=` URL param via `useSearchState`, so users see two inputs for the same thing.

2. **Shop card buried (DEV-303):** `ShopPreviewCard` floats at `absolute bottom-6 left-1/2 z-30 -translate-x-1/2` inside the map area with a hardcoded `w-[340px]`. The bottom-center position is easy to miss and the card is visually small relative to the map. Mobile uses `ShopCarousel` and is unaffected.

Both issues share the same files (`app/page.tsx`, `components/map/map-desktop-layout.tsx`), so they are designed and shipped together as one UX pass. The previous consolidation (DEV-281, commit f7f16c2) left the page structure fresh, which makes this the right moment.

## Goals

- Eliminate the dual-bar cognitive overhead — one visible search input at a time.
- Give the selected shop card real presence on desktop without stealing space from the map.
- Preserve mobile parity (same functionality, different layout) per project design principles.
- Keep re-search accessible after scrolling past the hero.

## Non-Goals

- No changes to ranking, search logic, or `useSearchState` hook.
- No new search modes, filters, or chip types.
- No new e2e critical journey.
- No changes to mobile `ShopCarousel` behavior.

## Design Decisions

### DEV-302 — Unify dual search bar

**Decision:** Keep the hero `SearchBar` as the primary entry point. Remove the map-overlay `filters/search-bar.tsx` from both desktop and mobile layouts. Add a new `StickySearchBar` that appears at the top of the viewport once the hero section scrolls out of view, via `IntersectionObserver` on the hero `<section>`.

- Filter button moves to the sticky bar (desktop + mobile) and to the sidebar header on desktop.
- Mobile also gets a small standalone floating filter button on the map while the hero is still visible, so filter access is never more than one tap away.
- `StickySearchBar` mirrors the hero input's contract — `defaultQuery` + `onSubmit` — and reads/writes the same `?q=` param.

**Why IntersectionObserver over scroll position:**
The codebase already uses raw `IntersectionObserver` for similar scroll-triggered UI (`components/community/community-card.tsx`), so this stays consistent with existing patterns. No new custom hook needed.

### DEV-303 — Inline expanded shop card

**Decision:** Remove the floating `ShopPreviewCard` overlay from `MapDesktopLayout` entirely. In the sidebar list, when a shop is selected (via map pin click or sidebar click), that shop's row in the list expands inline to render the full `ShopPreviewCard` (full-width) instead of the compact `ShopCardCompact`. Auto-scroll the sidebar to bring the expanded card into view.

- `ShopPreviewCard` loses its hardcoded `w-[340px]` — width becomes parent-controlled.
- Map stays visually clean.
- Mobile unchanged — continues to use `ShopCarousel`.

**Why inline expansion over slide-in panel or top-right float:**
Pencil exploration (`caferoam-design.pen`, frame `I6ScR`) compared three treatments:
- Option 1 (top-right floating 440px): still competes with the map for attention.
- Option 2 (sidebar inline expansion): clean map, selected card gets real presence (full sidebar width ≈ 420px), no extra chrome, reuses existing `ShopPreviewCard`.
- Option 3 (three-column slide-in panel): introduces a new layout region and eats map real estate.

Option 2 won — it is the lowest-cost path (no new component, no layout shift) and gives the clearest signal of which shop is selected.

## Alternatives Rejected

- **Single inline search bar with no sticky behavior** — users scrolling past the hero lose access to re-search without scrolling all the way back up. Rejected.
- **Collapse hero + map search into a single always-visible top bar** — loses the hero's role as an entry/branding moment on cold load. Rejected.
- **Floating top-right shop card (440px)** — still visually competes with the map; only marginally better than current. Rejected in Pencil review.
- **Three-column layout (map + sidebar + details panel)** — steals 300–400px of horizontal space from the map on a 1512px viewport. Rejected.
- **New `ShopCardSelected` component** — unnecessary; removing `w-[340px]` from `ShopPreviewCard` and letting the parent control width achieves the same result without duplication. Rejected.

## Architecture

### Component graph (after change)

```
app/page.tsx
├── <StickySearchBar> (new)            — visible when hero offscreen
├── <section ref={heroRef}> (hero)     — observed by IntersectionObserver
│   ├── <SearchBar>                     — components/discovery/search-bar.tsx
│   ├── <ModeChips>
│   └── <SuggestionChips>
└── <MapWithFallback>
    ├── <MapDesktopLayout>
    │   ├── sidebar header (+ filter button, new)
    │   ├── shop list
    │   │   ├── <ShopCardCompact>       — non-selected rows
    │   │   └── <ShopPreviewCard>       — selected row, inline, full-width (new position)
    │   └── map canvas                  — no floating overlay, no search bar
    └── <MapMobileLayout>
        ├── standalone filter button    — new, absolute top-4 right-4
        ├── map canvas                  — no search bar
        └── <ShopCarousel>               — unchanged
```

### Data flow

- Hero `SearchBar` and `StickySearchBar` both call `handleSearchSubmit` from `app/page.tsx`, which already writes to `?q=` via `useSearchState`. No store changes.
- `heroVisible` is local `useState` in `app/page.tsx`, driven by a single `IntersectionObserver` on `heroRef.current` with `threshold: 0`. Observer created in `useEffect`, cleaned up on unmount.
- `MapDesktopLayout` receives `selectedShopId` (existing prop). A new `selectedCardRef` + `useEffect([selectedShopId])` calls `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` whenever selection changes.

### Visibility toggle (not mount/unmount)

`<StickySearchBar>` stays in the DOM and toggles via CSS (`invisible h-0 overflow-hidden` when hero is visible). Keeping it mounted avoids layout shift and lets the browser preserve focus/caret state if the user starts typing.

## Testing Classification

### (a) New e2e journey?
- [ ] **No** — existing journeys J07 (search), J08 (mode chips), J09 (suggestion chips), and J21 (filter + re-search) cover the user-visible behavior. Selectors may need disambiguation (the map-area bar is being removed), but no new critical path is introduced.

### (b) Coverage gate impact?
- [ ] **No** — no critical-path service touched. `search_service`, `checkin_service`, `lists_service` are untouched. Changes are UI-layer only.

### Drift risk

`e2e/search.spec.ts` contains selectors like `form[role="search"]` that today can match either the hero bar or the map-overlay bar. After the map-overlay bar is removed, these should resolve unambiguously to the hero bar, but the specs should be grepped and verified as part of Phase 3.

## Verification Plan

- `pnpm build` — zero TypeScript errors.
- `pnpm test` — all unit tests green (use-search-state, use-search, page tests, plus new `sticky-search-bar.test.tsx`).
- Manual desktop (1512×823):
  - Hero + single search bar visible on cold load.
  - Scroll past hero → sticky bar appears at top; scroll back → hero bar visible, sticky bar hidden.
  - Click map pin → matching sidebar row expands inline to full card; sidebar auto-scrolls to bring it into view.
  - Filter button accessible in sidebar header and sticky bar.
  - No floating card, no map-overlay search bar.
- Manual mobile (390×844):
  - Hero bar only on cold load.
  - Scroll past hero → sticky bar with filter button.
  - Standalone floating filter button visible on map while hero is in view.
  - `ShopCarousel` behavior unchanged.
- `pnpm test:e2e` — J07, J08, J09, J21 all pass.
- `grep -r 'role="search"' e2e/` — verify no selectors target the removed bar.

## Related

- ADR: `docs/decisions/2026-04-07-sticky-search-bar-intersection-observer.md` (intersection observer pattern vs scroll listener) — _deferred, pattern is already in use in `community-card.tsx` so no new ADR needed._
- Previous page consolidation: commit `f7f16c2` (DEV-281).
- Pencil exploration file: `caferoam-design.pen` frames `nUpZV` (search layout) and `I6ScR` (card treatment).
