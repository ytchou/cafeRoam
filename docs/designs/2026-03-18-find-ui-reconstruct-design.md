# Design: UI Reconstruct — Find

**Date:** 2026-03-18
**Status:** Approved
**Pencil frames:** `c62Ni` (Map View), `vEqbC` (Map View / Filter Panel), `MygeB` (Map View / List), `3hOsp` (Shop View), `ENKsc` (Shop View / Directions)

---

## Overview

The Find tab (`/`) is the primary discovery surface of CafeRoam. After the Phase 3 navigation restructure (PR #43), the old Home + Map split was unified into a single map-first Find page. This design formalizes the visual reconstruction of all Find-related screens and sub-screens.

**Scope:** Five screens — Find page, Shop card (list view) + map pin (map view), Shop View, Filter panel, Directions sheet.

**Not in scope:** Shop owner claim flow (lightweight contact form only — see Claim Banner below). Community Notes (Phase 3+).

---

## Screens

### 1. Find Page — Map View (`c62Ni`)

**Default state when user lands on 地圖 tab.**

- **Full-screen Mapbox** map as base layer (warm/muted style, not default Google blue).
- **Floating top overlay** (glassmorphism gradient): status bar → search bar → filter pills.
- **Search bar** (`SearchBar` component): min 48px height, sparkle icon, placeholder "Search coffee shops...", dark filter button (icon: sliders-horizontal, fill `#2C1810`) on the right.
- **Filter pills row** (`FilterPills` component): Open Now, WiFi, Pastries, Quiet, scrollable. Active state: `#2C1810` fill + white text. Inactive: white + `#6B7280`.
- **Branded map pins:** Coffee cup icon (lucide `coffee`) in a 40×40 circle with drop tip polygon. Default: `$--map-pin` (brown `#8B5E3C`). Selected/active: `$--accent-coral` (`#FF6B6B`). 44px tap target.
- **My Location button:** Floating at bottom-right of map area, white circle with locate icon.
- **Bottom Card Area** (slides up from bottom): drag handle → "Nearby Coffee Shops" header with count + **map/list toggle** → horizontal-scroll shop cards → tab bar pill.
  - Toggle: 2-segment pill (`$--tag-active-bg` for active segment, transparent for inactive). Map View shows **map active**.
- **Bottom nav pill:** 地圖 (active, dark fill) / 探索 / 收藏 / 我的.

### 2. Find Page — List View (`MygeB`)

**State when user taps the list icon in the toggle.**

- **No map.** Background is `$--background` (`#F5F4F1`).
- Same **search bar** and **filter pills** as Map View, but over solid background (no glassmorphism).
- **Section header:** "Nearby Coffee Shops" + count + toggle showing **list active**.
- **Shop list cards** (full-width, vertically stacked, separated by 1px `#E5E4E1` dividers):
  - Left: 64×64 photo thumbnail (cornerRadius 10).
  - Center: shop name (15px/600, DM Sans) + meta row (rating ★, distance, open status) in gray `#6B7280`.
  - Right: chevron-right icon.
  - Card height: 80px. No explicit background (blends with page bg).
- **Bottom nav pill:** Same as Map View, 地圖 active.

### 3. Shop Card — Horizontal Scroll (in Map View bottom area)

Used inside the "Nearby Coffee Shops" horizontal scroll in the Map View bottom card area.

- **Size:** 260×190px (fixed width card, fill_container height).
- **Structure:** Top 80px photo (image fill) → bottom content area: shop name (bold), distance chip, rating with ★, tag chips (up to 2).
- **Interaction:** Tap navigates to Shop Detail (`/shops/[shopId]/[slug]`).

### 4. Map View / Filter Panel (`vEqbC`)

**Opens as a bottom sheet from the filter button or "篩選" pill.**

- **Sheet:** Slides up from bottom (cornerRadius `[24,24,0,0]`, white, max 85vh). Drag handle at top.
- **Header row:** "Filters" title (bold 18px) + selected count badge (green `#C8F0D8`) + "Clear All" link.
- **Search bar:** "Search 105 filters..." input inside the sheet. Allows searching all tags by name.
- **5 category tabs** (horizontal scroll row): Functionality · Time · Ambience · Mode · Food. Active tab: `#2C1810` fill + white text. Inactive: `#F5F4F1` + gray text.
  - **Functionality (27 tags):** WiFi, outlets, seating, work-friendly, pet-friendly, etc.
  - **Time (tags):** No time limit, open late, early bird, weekend, 24hr.
  - **Ambience (tags):** Quiet, cozy, lively, chit-chat, romantic.
  - **Mode (tags):** Work, rest, social, specialty.
  - **Food (tags):** Espresso, pour-over, matcha, pastries, brunch, vegan, dessert.
- **Tags area:** Chip grid, multiple rows. Active chips: `#2C1810` fill + white. Inactive: white + `#E5E4E1` border.
- **Footer CTA:** "Show N places" button (green `#3D8A5A`, full-width, 52px).

### 5. Shop View (`3hOsp`)

**Full-page SSR route: `/shops/[shopId]/[slug]`**

Single-column scroll. Answers "is this place right for me?" in order:

1. **Hero photo** — full-width, 260px. Photo count badge (bottom-left). Back button + bookmark button overlay.
2. **Shop Identity** — name (bold, 20px), distance chip, rating (★ 4.x, N reviews), open status (Open/Closed · hours), neighborhood + district.
3. **Action row** — Get There · Check In · Save · Share (4 equal-width ghost buttons with icons).
4. **About** — AI-generated 2-line description. "Try Catalan..." editorial label.
5. **Tags** — taxonomy chips (up to 6, "See all" link). Soft background pills from taxonomy.
6. **Hours & Info** — collapsible daily hours + website/call action chips.
7. **Reviews** — auth-gated section header ("N at 1,234" count), 2 review cards (avatar, stars, text excerpt). "See all" link.
8. **Claim banner** (bottom) — "Is this your café? Click to manage your info." Lightweight contact form link. Deferred full claim flow to post-MVP.

### 6. Shop View / Directions (`ENKsc`)

**Opens as bottom sheet from "Get There" action button.**

- Map thumbnail (Mapbox static image API, not interactive) showing shop location.
- **Walking time** — `~N min walk` · distance via Yongkang St · Mapbox estimate.
- **Drive time** — `~N min drive` · distance via main road · Mapbox, may vary with traffic.
- **Nearest MRT** — Station name + `N min walk` · calculated via hardcoded JSON (~130 Taipei MRT stations, Haversine distance) + Mapbox walking directions.
- **Deep link buttons** — "Open in Google Maps" + "Open in Apple Maps" (iOS/Android conditional rendering in implementation).

---

## Data & State

### URL-driven state (shared with existing implementation)

| Param                                 | Values                  | Component                            |
| ------------------------------------- | ----------------------- | ------------------------------------ |
| `?q=<query>`                          | text search string      | `SearchBar`                          |
| `?mode=work\|rest\|social\|specialty` | optional, single-select | `ModeChips` (in FilterSheet)         |
| `?filters=wifi,outlet,...`            | comma-separated tag IDs | `FilterPills` / `FilterSheet`        |
| `?view=list\|map`                     | toggle state            | new — controls Map View vs List View |

### View toggle implementation

The `?view=list` URL param controls which Find state is shown:

- `view=map` (default): full-screen Mapbox with bottom card area.
- `view=list`: list-only view with no map.

Both states live on the same `/` route. A `useSearchState` hook reads/writes the param.

### MRT station data

Hardcoded JSON file at `lib/data/taipei-mrt-stations.json` (~130 stations with lat/lng, name, line). No API call needed for nearest-station lookup — Haversine distance only. Mapbox Directions API used only for walking time to the station.

---

## Auth Wall

Per spec: unauthenticated users can access map, list, filter, and shop detail. Semantic search requires login (SearchBar shows login prompt on submit if no session).

---

## Analytics

| Event                | Trigger                         | Properties                                       |
| -------------------- | ------------------------------- | ------------------------------------------------ |
| `search_submitted`   | SearchBar submit                | `query_text`, `mode_chip_active`, `result_count` |
| `filter_applied`     | FilterPills / FilterSheet apply | `filter_type` ('quick'\|'sheet'), `filter_value` |
| `shop_detail_viewed` | Shop View mount                 | `shop_id`, `referrer`, `session_search_query`    |
| `shop_url_copied`    | ShareButton                     | `shop_id`, `copy_method`                         |
| `view_toggled`       | map/list toggle                 | `to_view` ('map'\|'list') — **new event**        |

---

## Implementation Notes

### Components to create/update

| Component                                          | Action | Notes                                                                                    |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `app/page.tsx`                                     | Update | Add `?view` param support; split into `MapFindView` + `ListFindView` sub-components      |
| `components/map/map-view.tsx`                      | Update | Branded pins (coffee cup icon + drop tip polygon), selected state uses `$--accent-coral` |
| `components/map/map-mini-card.tsx`                 | Keep   | No changes needed                                                                        |
| `components/map/map-desktop-card.tsx`              | Keep   | No changes needed                                                                        |
| `components/map/map-list-view.tsx`                 | Update | Wire as the list-view state for mobile (currently used only on desktop)                  |
| `components/discovery/filter-pills.tsx`            | Update | Wire `onOpenSheet` callback to open `FilterSheet`                                        |
| `components/discovery/filter-sheet.tsx`            | Update | Add 5th "Food" tab; extend tag lists                                                     |
| `components/discovery/mode-chips.tsx`              | Update | Wire into Filter Sheet "Mode" tab (currently unused on Find page)                        |
| `lib/hooks/use-search-state.ts`                    | Update | Add `view` param ('map'\|'list') with 'map' default                                      |
| `lib/data/taipei-mrt-stations.json`                | Create | ~130 Taipei MRT stations (lat/lng, name, line, exit info)                                |
| `app/shops/[shopId]/[slug]/shop-detail-client.tsx` | Keep   | Already complete; claim banner already present                                           |
| `components/shops/directions-sheet.tsx`            | Create | New: Mapbox static map thumbnail + walk/drive/MRT times + deep links                     |

### Mapbox pin implementation

Custom markers via `react-map-gl` `<Marker>` component with a React element child (coffee cup + drop tip). Replace current SVG circle approach.

```tsx
// Pin states
const defaultPin = { fill: '$--map-pin', size: 40 };
const selectedPin = { fill: '$--accent-coral', size: 44 }; // 10% larger on selection
```

### MRT station lookup

```typescript
// lib/utils/mrt.ts
import stations from '@/lib/data/taipei-mrt-stations.json';

export function nearestMrtStation(lat: number, lng: number) {
  return stations.reduce(
    (nearest, station) => {
      const dist = haversine(lat, lng, station.lat, station.lng);
      return dist < nearest.dist ? { ...station, dist } : nearest;
    },
    { dist: Infinity } as MrtStation & { dist: number }
  );
}
```

---

## Verification

- [ ] Map view renders branded coffee cup pins (default brown, selected coral)
- [ ] List view toggle switches between map and list (URL updates `?view=`)
- [ ] Filter sheet opens with 5 tabs; search works across all 105 tags
- [ ] Shop View renders all 8 sections (hero through claim banner)
- [ ] Directions sheet: walking time, drive time, MRT station all populate from Mapbox API
- [ ] Google Maps + Apple Maps deep links open correctly on mobile
- [ ] Auth wall: semantic search prompts login for unauthenticated users
- [ ] All new/modified components have Vitest tests
- [ ] `pnpm test`, `pnpm type-check`, `pnpm build` pass
