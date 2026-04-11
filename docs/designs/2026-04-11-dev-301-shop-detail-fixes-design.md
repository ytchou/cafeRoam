# DEV-301 — Shop Detail Page Fixes (Design)

**Date:** 2026-04-11
**Linear:** [DEV-301](https://linear.app/ytchou/issue/DEV-301/fix-shop-detail-page-photo-gallery-navigation-desktop-map-pin-and-maps)
**Status:** Design approved, ready for implementation

---

## Context

Three independent UI bugs were found on the shop detail page (`/shops/[shopId]/[slug]`) during manual QA at 1512×823 desktop. Shop detail is a core pre-beta surface — broken map and no photo browsing hurt first impressions during the Beta Launch milestone. The bugs are unrelated in root cause but all live in the same page component tree, so fixing them together in one PR avoids churn and duplicated review/test cycles.

### Bug 1 — No photo gallery navigation

`components/shops/shop-hero.tsx` only renders `photoUrls.at(0)`. Shops with many photos (observed: 15) show only the first image. A "15 photos" badge exists but is visual-only — there is no swipe, carousel, or lightbox affordance. No carousel infrastructure exists anywhere in the codebase (no shadcn Carousel, no embla dep, no custom gallery).

### Bug 2 — Desktop maps links misaligned

`app/shops/[shopId]/[slug]/shop-detail-client.tsx:250-253` renders the Google/Apple Maps link row as a bare `<div className="hidden gap-2 lg:flex">` with no `px-5 py-3` padding. It sits orphaned between `ShopActionsRow` and a horizontal divider, visually detached from the map it references. The mobile version (line 366-368) lives inside the Location section below `ShopMapThumbnail` with proper padding — that layout was the intended placement.

### Bug 3 — Missing location pin on desktop Mapbox

Root cause verified: `components/shops/shop-map-thumbnail.tsx` does NOT import `mapbox-gl/dist/mapbox-gl.css`. The Mapbox GL CSS is imported in `components/map/map-view.tsx:6` and `components/lists/favorites-mini-map.tsx:4`, but if neither is mounted before visiting the shop detail page (common direct-link path), the global `.mapboxgl-marker` positioning CSS is absent. The marker div mounts inside the map but renders unstyled/mispositioned and is invisible. Mobile works by accident because the mobile path uses the Mapbox Static API (server-rendered pin baked into the image — no JS Mapbox, no CSS needed).

## Decisions

### Photo gallery approach — shadcn Carousel (Embla)

Chose shadcn Carousel over alternatives:

- **shadcn Carousel (chosen)** — swipeable on mobile, prev/next arrows on desktop, slide indicator. Photos swap in-frame (existing hero container). Well-supported, accessibility-friendly, ~8kb for `embla-carousel-react`. Matches existing shadcn pattern in `components/ui/`.
- **Native scroll-snap row** — rejected: no prev/next controls without hand-rolled JS, and we'd need to reimplement a slide indicator anyway.
- **Tap-to-open lightbox** — rejected: more complexity for V1. Deferred; can be added later on top of the carousel if user testing demands it.

### Maps links placement — unify on mobile layout

Chose to move the desktop block to match mobile placement (inside the Location section, below `ShopMapThumbnail`):

- **Unify (chosen)** — delete the orphaned desktop block; drop `lg:hidden` from the mobile block so a single markup serves both breakpoints. Matches the design the ticket calls "correct."
- **Fix alignment in place** — rejected: splits the layout into two maintenance points for no user-visible benefit.
- **Inline as sidebar next to map on desktop** — rejected: adds a new layout branch when the mobile layout is already approved.

### Desktop map pin — one-line CSS import

Root cause verified by reading `shop-map-thumbnail.tsx` (no CSS import) and confirming `map-view.tsx:6` / `favorites-mini-map.tsx:4` both import the CSS. Fix: add `import 'mapbox-gl/dist/mapbox-gl.css'` to `shop-map-thumbnail.tsx`. Matches the existing project pattern.

## Architecture

No new abstractions. Three surgical edits + one new shadcn primitive:

```
components/ui/carousel.tsx          NEW — stock shadcn Carousel (Embla-based)
components/shops/shop-hero.tsx      MODIFY — client component, Carousel integration
components/shops/shop-map-thumbnail.tsx    MODIFY — add CSS import
app/shops/[shopId]/[slug]/shop-detail-client.tsx    MODIFY — unify maps links placement
package.json                        MODIFY — add embla-carousel-react dep
```

Provider abstraction boundary: none affected. No backend, no DB, no auth. Pure frontend fix.

## Data flow

Unchanged. `shop.photoUrls: string[]` is already passed to `ShopHero`. The carousel consumes the same array — no new props needed at the call site. `shop-detail-client.tsx:226-231` passes `photoUrls={photos}` today; this continues to work.

## Error handling

- **Empty `photoUrls`** — fall back to the existing initials block (`shopName.at(0)`). No change.
- **Single photo** — render the Carousel with one item, no prev/next arrows, no slide indicator. Unified code path.
- **Image load failure** — existing `next/image` behavior. No change.
- **Mapbox CSS failure** — if the CSS import fails (shouldn't — it's a package file), Next.js build will fail loudly. No runtime handling needed.

## Testing strategy

### Component tests (Vitest + Testing Library)

**`components/shops/shop-hero.test.tsx`** (existing file — update):
- Single photo still renders the image (existing assertion continues to pass)
- Multiple photos: all slides are in the DOM; initial indicator shows "1 / N"
- Multiple photos: clicking the desktop "next" button changes the indicator to "2 / N"
- Back / save / share callbacks still fire (existing assertions preserved)
- Zero photos: initials fallback renders, no carousel
- Single photo: no prev/next buttons rendered, no slide indicator rendered

**`components/shops/shop-map-thumbnail.test.tsx`** (existing — no changes required): current assertions verify both rendering paths. The CSS import is side-effectful and not directly testable; regression is covered by the passing existing suite.

**`app/shops/[shopId]/[slug]/shop-detail-client.test.tsx`** (existing — minor update):
- Existing "Google Maps link" / "Apple Maps link" assertions: ensure selectors still match after the markup consolidation. If they grep by href, no change needed. If they rely on the `.hidden.lg:flex` container, update to target the Location section container.
- Add one assertion: the navigation links render exactly once in the DOM (not twice).

### E2E drift risk

The research subagent flagged four e2e tests that reference shop detail content. Drift check plan:

| File | Risk | Mitigation |
|---|---|---|
| `e2e/discovery.spec.ts:450-475` (J36) | Uses `a[href*='google.com/maps']:visible` and `a[href*='maps.apple.com']:visible`. Currently may find duplicate elements across desktop+mobile blocks. After fix: exactly one visible link per href pattern at a given viewport. | Run the test post-fix; update expectations from "first visible" to just "visible" if needed. Likely already passes since `:visible` filters one. |
| `e2e/discovery.spec.ts:332-340` (J28) | Desktop 2-column layout check. Carousel in `ShopHero` should not change the outer container. | Run test; verify no regression. |
| `e2e/checkin.spec.ts:213` | Reviews section on shop detail. Carousel is above the fold — should not interfere. | Run test. |
| `e2e/lists.spec.ts:306,326` | Save-to-list flow navigating through shop detail. Carousel prev/next buttons could potentially intercept click events on overlay buttons. | Run test; verify save button still clickable. Carousel controls are scoped to the image area, not the overlay row. |

All e2e updates (if any) ship in the same PR as the component change — no follow-up cleanup tickets.

### Testing classification

**(a) New e2e journey?** No — bug fix on an existing page, not a new critical path. No e2e journey added to `/e2e-smoke`.

**(b) Coverage gate impact?** No — no critical-path service touched (no `search_service`, `checkin_service`, `lists_service`, auth, or providers). Frontend-only fix. Coverage gate unchanged.

**(c) E2E drift risk?** Yes — four tests flagged above. `/writing-plans` adds an explicit task to re-run them and patch any that break.

## Alternatives rejected

Recorded on the Linear ticket body for traceability. See DEV-301 description.

## Out of scope

- Full-screen lightbox / tap-to-zoom — deferred to post-beta.
- Consolidating the two `dynamic()` imports in `shop-map-thumbnail.tsx` (lines 6-13 import the same module twice) — cosmetic, not required by this bug fix.
- Re-initializing the Mapbox map when the viewport crosses the mobile↔desktop breakpoint — separate latent issue with mount-time breakpoint detection. Not caused by DEV-301 and not observed by QA.
