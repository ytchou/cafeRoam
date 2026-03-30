# Design: Map Pin Progressive Disclosure (DEV-111)

**Date:** 2026-03-30
**Status:** Approved
**Ticket:** DEV-111

---

## Overview

Pin clicks on the desktop map currently call `handleShopNavigate` directly, bypassing the discovery context entirely. This creates disorientation — the user loses their place in the map view.

The fix introduces a progressive disclosure flow:

**pin click → side panel highlight + scroll → floating preview card → user navigates via CTA**

Mobile is unaffected: the carousel already scrolls to the selected card via `scrollIntoView` (no changes needed).

---

## Decisions

- **Floating card, not inline expansion** — Side panel inline expansion was considered but rejected; the ticket explicitly asks for a modal-style preview, and DESIGN.md describes "glassmorphism floating panel" as the correct pattern for map-overlaid UI.
- **Bottom-center placement** — Matches DESIGN.md "mini floating card at bottom or side"; bottom-center is most visible and doesn't obscure either the left panel or the right map edge.
- **`onShopClick` accepts `null`** — Cleanest way to propagate deselection up to `FindPageContent` without threading a separate `onClearSelection` prop. Accepted by `setSelectedShopId` which is already `Dispatch<SetStateAction<string | null>>`.
- **Auto-expand on pin click** — If the side panel is collapsed when a pin is clicked, it auto-expands so the user sees the card highlight alongside the preview modal. The user can re-collapse manually.
- **Mobile: no change** — Carousel scroll via `scrollIntoView` is already wired to `selectedShopId` changes. Mobile pin click already calls `setSelectedShopId`.

---

## Component Tree (desktop only)

```
MapDesktopLayout
  ├── LeftPanel (auto-expands on pin click if collapsed)
  │   └── ShopCardCompact[] → scroll-to-selected via useRef + useEffect
  ├── CollapseToggle
  ├── MapView → onPinClick calls setSelectedShopId (not navigate)
  └── [NEW] ShopPreviewCard (absolute, bottom-center of map area)
        ↑ rendered when selectedShopId != null
```

---

## New Component: `components/shops/shop-preview-card.tsx`

```
┌───────────────────────────────────────┐
│ [60px  │ Café Name              [✕]   │
│  photo]│ ★ 4.3 · 350m · Open         │
│        │ [WiFi] [Quiet] [No limit]    │
├────────┴──────────────────────────────┤
│            [View Details →]           │
└───────────────────────────────────────┘
```

**Props:**
```ts
interface ShopPreviewCardProps {
  shop: MappableLayoutShop;
  onClose: () => void;   // calls onShopClick(null) at page level
  onNavigate: () => void; // calls handleShopNavigate(shop.id) at page level
}
```

**Styles:**
- Container: `absolute bottom-6 left-1/2 -translate-x-1/2 z-30`
- Card: `w-[340px] backdrop-blur-md bg-white/80 rounded-2xl shadow-xl overflow-hidden`
- Animation: `transition-all duration-200`

**Close mechanisms:**
1. X button on card → `onClose()`
2. ESC key → `onClose()`
3. Clicking a different pin → card updates to new shop (no close needed)

**Fields shown:** photo (60×60px), name, rating (★ N.N), distance (`distance_m`), open status (`is_open`), tags (up to 3 `taxonomyTags`), "View Details →" CTA.

---

## Data Flow Changes

### `app/page.tsx`

```diff
- onShopClick={isDesktop ? handleShopNavigate : setSelectedShopId}
+ onShopClick={setSelectedShopId}
```

`onCardClick={handleShopNavigate}` unchanged — side panel card clicks still navigate.

### `MapWithFallbackProps` + `MapDesktopLayoutProps`

```diff
- onShopClick: (id: string) => void;
+ onShopClick: (id: string | null) => void;
```

### `MapDesktopLayout` additions

1. `useRef<HTMLDivElement>` on the scrollable card list container
2. `data-shop-id={shop.id}` wrapper div on each card in the list
3. `useEffect([selectedShopId])` for auto-expand + scroll:

```ts
useEffect(() => {
  if (!selectedShopId) return;
  const scroll = () =>
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-shop-id="${selectedShopId}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  setPanelCollapsed((prev) => {
    if (prev) { setTimeout(scroll, 200); return false; }
    scroll();
    return false;
  });
}, [selectedShopId]);
```

4. `selectedShop = shops.find(s => s.id === selectedShopId) ?? null`
5. Render `<ShopPreviewCard>` inside the map container div when `selectedShop !== null`

---

## Analytics

Add `shop_preview_opened` PostHog event in `ShopPreviewCard` on mount:
```ts
capture('shop_preview_opened', { shop_id: shop.id, source: 'map_pin' });
```

---

## Testing

### Unit tests (`components/map/map-desktop-layout.test.tsx`)

| Test | Description |
|------|-------------|
| Pin selection | Changing `selectedShopId` highlights correct `ShopCardCompact` (via `selected` prop) |
| Auto-expand | When `selectedShopId` changes to non-null and panel is collapsed, panel auto-expands |
| Preview renders | Preview card shows shop name, rating, tags when `selectedShopId` is set |
| X button | X button calls `onShopClick(null)` |
| ESC key | Pressing ESC calls `onShopClick(null)` |
| View Details | "View Details" button calls `onCardClick(shopId)` |

### Testing Classification

- **New e2e journey?** No — map pin selection is part of the existing discovery journey.
- **Coverage gate impact?** No — frontend-only, no critical-path service touched.

---

## Files Changed

| File | Change |
|------|--------|
| `app/page.tsx` | 1-line: change desktop `onShopClick` wiring |
| `components/map/map-with-fallback.tsx` | Type update: `onShopClick` accepts `null` |
| `components/map/map-desktop-layout.tsx` | Add scroll ref, auto-expand effect, preview card render |
| `components/shops/shop-preview-card.tsx` | **NEW**: floating glassmorphism preview card |
| `components/map/map-desktop-layout.test.tsx` | New tests for above behavior |
