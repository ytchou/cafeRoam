# Design: Find Page Map-List Synchronization (DEV-163)

Date: 2026-04-01

## Problem

Two missing map-list synchronization behaviors on the Find page:

1. **Card click → map**: Clicking a shop card doesn't fly to or highlight the pin on the map.
2. **Viewport → count/list**: The "N places nearby" count and shop list are static — they don't filter by the visible map viewport.

## Architecture

### Bug 1: Card click → flyTo + highlight (DEV-165)

**Current state:** `selectedShopId` flows from FindPageContent → MapView. GL paint expressions conditionally style the selected pin. However, both flyTo and highlight are broken on card click.

**Fix:** Add a `useEffect` in MapView that reacts to `selectedShopId` changes:

1. Look up the selected shop's coordinates from `geojsonData`
2. Call `map.flyTo({ center, zoom })` to pan/zoom to the pin
3. If the pin would be inside a cluster at current zoom, zoom to `clusterMaxZoom + 1` (15)
4. Debug and fix the GL paint expression if it's not updating reactively

No new props needed — `selectedShopId` and `shops` are already passed.

### Bug 2: Viewport-based filtering (DEV-166)

**Data flow:**

```
MapView map.on('moveend') → getBounds() → onBoundsChange(bounds)
    ↓
FindPageContent stores mapBounds in state
    ↓
shops useMemo filters by bounds → only visible shops reach layout
    ↓
CountHeader & ShopCarousel auto-update via filtered count/list
```

**Implementation:**

- MapView adds `onBoundsChange?: (bounds: { north, south, east, west }) => void`
- Fires on `moveend` + initial `load`
- FindPageContent stores `mapBounds` state, filters shops by lat/lng containment
- When view is `'list'`: skip bounds filtering (show all shops)

### Edge cases

- **No bounds yet** (map loading): show all shops
- **flyTo triggers moveend**: intentional — list syncs to area around selected shop
- **Cluster zoom**: flyTo zooms to 15 if selected pin is clustered at current zoom

## Files touched

1. `components/map/map-view.tsx` — `onBoundsChange` callback, `useEffect` for flyTo
2. `app/page.tsx` — `mapBounds` state, bounds filtering in `shops` useMemo
3. `components/map/map-desktop-layout.tsx` — pass `onBoundsChange` to MapView
4. `components/map/map-mobile-layout.tsx` — pass `onBoundsChange` to MapView
5. `components/map/map-with-fallback.tsx` — thread `onBoundsChange` prop

## Testing classification

- [x] No — no new e2e journey (existing Find page interaction)
- [x] No — no critical-path service touched (frontend-only)

## Alternatives rejected

- **Filter inside MapView**: Keeps filtering in one place (parent) where all other filters live. Rejected moving it into MapView.
- **Count-only update without list filtering**: Inconsistent UX — count says 12 but list shows 164. Rejected.
