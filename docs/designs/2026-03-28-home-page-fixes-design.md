# Design: Home Page Fixes — Map View Navigation + Taxonomy Tags

Date: 2026-03-28
Branch: `fix/home-page`

## Context

Manual inspection of the home page (`/`) revealed two issues:

1. **Clicking a shop card in map view doesn't navigate to the shop detail page** — it only highlights/selects. This contradicts the original map view design (`2026-03-19-map-view-rebuild-design.md`) which specifies "Card tap → shop detail".
2. **No taxonomy tags displayed on ShopCardCompact** — the `taxonomyTags` field exists in `LayoutShop` and `CompactShop` interfaces but is never rendered. The Phase 2b design specifies `AttributeChips` (read-only taxonomy tag chips) on shop cards.

Both issues affect desktop and mobile map views.

## Fix 1: Shop Card Click Navigates to Detail

### Problem

In `app/page.tsx`, `layoutProps` sets `onShopClick: setSelectedShopId`. The list layouts (`ListDesktopLayout`, `ListMobileLayout`) correctly override this with `handleShopNavigate`, but the map layouts (`MapDesktopLayout`, `MapMobileLayout`) don't — they receive the selection-only handler.

### Solution

Split `onShopClick` into two concerns:
- **`onShopClick`** (existing) — used by map pins → `setSelectedShopId` (highlight card, scroll carousel)
- **`onCardClick`** (new, optional) — used by shop cards → `router.push('/shops/[id]')` (navigate)

Falls back: `onCardClick ?? onShopClick`, so existing callers without `onCardClick` are unaffected.

### Files

| File | Change |
|------|--------|
| `components/map/map-desktop-layout.tsx` | Add optional `onCardClick?: (id: string) => void` prop. `ShopCardCompact` uses `onCardClick ?? onShopClick`. |
| `components/map/map-mobile-layout.tsx` | Add optional `onCardClick?: (id: string) => void` prop. Pass through to `ShopCarousel`. |
| `components/map/shop-carousel.tsx` | Add optional `onCardClick?: (id: string) => void` prop. Card tap uses `onCardClick ?? onShopClick`. |
| `app/page.tsx` | Pass `onCardClick={handleShopNavigate}` to both `MapDesktopLayout` and `MapMobileLayout`. |

### Behavior Matrix

| View | Element | Action |
|------|---------|--------|
| Desktop map | Left panel card | Navigate to `/shops/[id]` |
| Desktop map | Map pin | Select/highlight card in panel |
| Mobile map | Carousel card | Navigate to `/shops/[id]` |
| Mobile map | Map pin | Scroll to card in carousel |
| Desktop list | Card | Navigate (already works) |
| Mobile list | Card | Navigate (already works) |

## Fix 2: Taxonomy Tag Pills on ShopCardCompact

### Problem

`ShopCardCompact` accepts `taxonomyTags` in its `CompactShop` interface but never renders them.

### Solution

Render up to 5 tags as small pill chips between the meta line (rating/distance/open) and the community summary snippet.

### Styling

- Pills: `bg-muted text-text-secondary rounded-full px-2 py-0.5 text-[11px] font-[family-name:var(--font-body)]`
- Row container: `flex flex-wrap gap-1`
- Language: `labelZh` (Chinese, matching Taiwan market UI)
- Max tags: 5 (slice from array)
- Conditional: only render row if `taxonomyTags` has items

### Visual

```
  Belinda Coffee              [photo]
  ★ 4.5  ·  350m  ·  Open
  [有插座] [安靜] [深夜營業]
  「很棒的工作空間...」
```

### File

| File | Change |
|------|--------|
| `components/shops/shop-card-compact.tsx` | Add tag pills row after `formatMeta` span, before community summary. |

## Testing Classification

- [x] No — no new e2e journey (existing map view path)
- [x] No — no critical-path service touched (frontend-only, no backend changes)

## Decisions

No significant architectural decisions — both fixes implement already-designed behavior that was missed during implementation.
