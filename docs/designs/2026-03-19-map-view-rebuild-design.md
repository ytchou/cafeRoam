# Map View Rebuild — Technical Design

Date: 2026-03-19

## Overview

Rebuild the Map View feature (Find page) from the approved design.pen screens. 6 screens total: 3 mobile (Map, Filter Panel, List) + 3 desktop (Map with left panel, Filter modal, List grid). All screens live at `/` with URL params controlling view state.

## Decisions

- **Rebuild from designs** — existing components diverge too far from new designs; fresh components in same directories, then delete old ones
- **Domain-split component organization** — `components/map/`, `components/shops/`, `components/filters/`, `components/discovery/`
- **Filter responsive wrapper** — vaul Drawer (mobile) + Radix Dialog (desktop)
- **Mobile carousel** — always visible, pin click auto-scrolls to card
- **Desktop left panel** — 420px collapsible with 20px minimal strip toggle
- **Desktop list grid** — CSS Grid, 3 columns
- **Two font families** — Bricolage Grotesque (headings/titles/counts) + DM Sans (body/meta/nav/tags). See [ADR](../decisions/2026-03-19-typography-two-fonts.md)
- **Separate card components** — ShopCardCarousel (vertical) and ShopCardCompact (row) are distinct components, not a polymorphic variant. See [ADR](../decisions/2026-03-19-separate-shop-card-components.md)
- **ShopCardCompact reused** — Desktop left panel and mobile list share ShopCardCompact with `selected` prop for accent border + highlight state

## Component Tree

```
app/page.tsx (FindPage)
├── [Mobile Map] MapMobileLayout
│   ├── MapView (Mapbox, full-bleed)
│   ├── MapOverlay (search + filters + count, glassmorphism gradient)
│   ├── ShopCarousel (bottom horizontal scroll of ShopCardCarousel)
│   ├── BottomNav
│   └── FilterSheet (vaul Drawer)
│
├── [Mobile List] ListMobileLayout
│   ├── SearchBar + FilterTags + CountHeader
│   ├── ShopCardCompact[] (scrollable rows)
│   ├── BottomNav
│   └── FilterSheet (vaul Drawer)
│
├── [Desktop Map] MapDesktopLayout
│   ├── HeaderNav
│   ├── LeftPanel (420px, collapsible)
│   │   ├── SearchBar + FilterTags
│   │   ├── CountHeader (with sort + view toggle)
│   │   └── ShopCardCompact[] (scrollable, selected = accent border)
│   ├── CollapseToggle (20px strip)
│   ├── MapView (fills remaining width)
│   └── FilterSheet (Radix Dialog modal)
│
├── [Desktop List] ListDesktopLayout
│   ├── HeaderNav
│   ├── TopBar (search + filters)
│   ├── CountHeader (with grid/list + distance toggle)
│   ├── ShopCardGrid[] (CSS Grid, 3 columns)
│   └── FilterSheet (Radix Dialog modal)
```

## Reusable Components (12)

| # | Component | Directory | Purpose | Key Props |
|---|-----------|-----------|---------|-----------|
| 1 | `SearchBar` | `filters/` | Search input with filter button | `onSearch`, `onFilterClick`, `placeholder` |
| 2 | `FilterTag` | `filters/` | Pill button with icon/dot + text | `label`, `icon?`, `dot?`, `active`, `onClick` |
| 3 | `FilterSheet` | `filters/` | Filter content + responsive wrapper | `open`, `onClose`, `filters`, `onApply` |
| 4 | `ViewToggle` | `discovery/` | Map/List segmented toggle | `view`, `onChange` |
| 5 | `CountHeader` | `discovery/` | "N places nearby" + toggle + sort | `count`, `view`, `onViewChange`, `onSort?` |
| 6 | `ShopCardCarousel` | `shops/` | Vertical card for mobile carousel | `shop`, `onClick` |
| 7 | `ShopCardCompact` | `shops/` | Row card for list + panel | `shop`, `selected?`, `onClick` |
| 8 | `ShopCardGrid` | `shops/` | Large photo card for desktop grid | `shop`, `onClick` |
| 9 | `MapPin` | `map/` | Coffee pin with triangle tip | `active?`, `onClick` |
| 10 | `BottomNav` | `navigation/` | Mobile pill tab bar (4 tabs) | `activeTab`, `onTabChange` |
| 11 | `HeaderNav` | `navigation/` | Desktop top nav bar | `activeTab` |
| 12 | `CollapseToggle` | `map/` | 20px strip to collapse sidebar | `collapsed`, `onClick` |

## Layout Components (4)

| Component | Screen | Description |
|-----------|--------|-------------|
| `MapMobileLayout` | Mobile map | Full-bleed map + gradient overlay + carousel + BottomNav |
| `ListMobileLayout` | Mobile list | SearchBar + tags + compact cards + BottomNav |
| `MapDesktopLayout` | Desktop map | HeaderNav + LeftPanel(420px) + MapView + CollapseToggle |
| `ListDesktopLayout` | Desktop list | HeaderNav + TopBar + 3-column grid |

## Data Flow

- URL params (`?q`, `?mode`, `?filters`, `?view`) are the single source of truth
- `useSearchState()` hook reads/writes URL state
- `useShops()` / `useSearch()` SWR hooks fetch data
- Computed shops list is memoized, filtered, sorted
- Pin click → `selectedShopId` → highlight card + auto-scroll

## Design Token Mapping

### Typography

| Role | Font | Weight | Size (Mobile) | Size (Desktop) |
|------|------|--------|---------------|----------------|
| Page title | Bricolage Grotesque | 700 | 17px | 15px |
| Count label | Bricolage Grotesque | 700 | 15px | 15px |
| Card name (carousel) | Bricolage Grotesque | 700 | 15px | — |
| Card name (compact) | DM Sans | 600–700 | 15px | 13px |
| Body / meta | DM Sans | 400–500 | 12–13px | 11–12px |
| Nav label (mobile) | DM Sans | 500–600 | 10–11px | — |
| Nav label (desktop) | DM Sans | 500–600 | — | 14px |
| Tag text | DM Sans | 500 | 13px | 12px |
| Search placeholder | DM Sans | 400 | 15px | 14px |

### Colors

| Token | CSS Variable | Value | Usage |
|-------|-------------|-------|-------|
| Map pin | `--map-pin` | `#8B5E3C` | Default pin color |
| Active dark | `--active-dark` | `#2C1810` | Active tab, filter btn, active tag bg |
| Primary green | `--primary` | `#3D8A5A` | "Open" status, Open Now dot |
| Foreground | `--foreground` | `#1A1918` | Primary text |
| Muted fg | `--muted-foreground` | `#6D6C6A` | Secondary text (desktop) |
| Text secondary | `--text-secondary` | `#6B7280` | Tag text, meta text (mobile) |
| Text tertiary | `--text-tertiary` | `#9CA3AF` | Placeholder, count text |
| Background | `--background` | `#F5F4F1` | Page bg, panel bg |
| Card bg | `--card` | `#FFFFFF` | Card backgrounds |
| Card selected | — | `#FDF8F5` | Desktop panel selected card |
| Border | `--border` | `#E5E4E1` | Dividers, card borders |
| Border medium | `--border-medium` | `#E5E7EB` | Search bar border, tag borders |
| Rating star | `--rating-star` | `#FCD34D` | Star icons |
| Toggle bg | — | `#F0EFED` | ViewToggle pill background |

### Shadows

| Element | Shadow |
|---------|--------|
| Search bar | `0 4px 16px #0000000A` |
| Shop cards | `0 4px 16px #0000000F` |
| Tab bar pill | `0 4px 20px #0000001A` |
| Map pin | `0 2px 8px #00000020` |
| My Location btn | `0 2px 12px #00000015` |

### Sizing

| Element | Mobile | Desktop |
|---------|--------|---------|
| Search bar height | 52px, radius 26px | 44px, radius 12px |
| Filter tag height | 36px, radius 20px | 36px, radius 20px |
| Carousel card width | 260px, img 80px | — |
| Compact card photo | 64×64px, radius 10px | 72×72px, radius 12px |
| Grid card image | — | flexible, ~280px wide |
| Tab bar pill height | 62px, radius 36px | — |
| Header nav height | — | 64px |
| Left panel width | — | 420px |
| Collapse toggle | — | 20×48px, radius [0,8,8,0] |
| Map pin | 40×48px (40 circle + 8 triangle) | same |
| My Location btn | 44×44px, radius 22px | same |

## Key Behaviors

1. **Mobile map carousel**: Always visible at bottom with gradient fade. Pin click auto-scrolls to card. Card tap → shop detail.
2. **Desktop left panel**: 420px, collapsible to 20px strip. Selected shop gets 3px left accent border + `#FDF8F5` bg + chevron-right.
3. **Filter responsive**: vaul Drawer on mobile, Radix Dialog on desktop. Same FilterContent component inside.
4. **View toggle**: URL-driven `?view=map|list`. Different layouts per device. Toggle pill with map/list icons.
5. **Search**: Auth-gated for semantic search. Login prompt if unauthenticated.
6. **Bottom nav**: Pill-shaped floating bar with 4 tabs: 地圖 (map-pin), 探索 (compass), 收藏 (heart), 我的 (user). Active = dark bg `#2C1810`.
7. **Desktop nav**: Horizontal bar with logo + nav items + search btn + avatar. Active = dark pill `#2C1810`.

## File Structure

```
components/
├── navigation/
│   ├── bottom-nav.tsx        ← rebuild
│   └── header-nav.tsx        ← rebuild
├── map/
│   ├── map-pin.tsx           ← new
│   ├── shop-carousel.tsx     ← new (horizontal scroll container)
│   └── collapse-toggle.tsx   ← new
├── shops/
│   ├── shop-card-carousel.tsx  ← new (vertical card for carousel)
│   ├── shop-card-compact.tsx   ← new (row card for list + panel)
│   └── shop-card-grid.tsx      ← new (photo card for desktop grid)
├── filters/
│   ├── search-bar.tsx        ← rebuild
│   ├── filter-tag.tsx        ← new
│   └── filter-sheet.tsx      ← rebuild
└── discovery/
    ├── view-toggle.tsx       ← new
    └── count-header.tsx      ← new
```

## Migration

1. Build reusable components (ShopCardCarousel, ShopCardCompact, ShopCardGrid, MapPin, FilterTag, ViewToggle, CountHeader)
2. Rebuild navigation (BottomNav, HeaderNav)
3. Rebuild filter components (SearchBar, FilterSheet)
4. Build layout containers (MapMobileLayout, ListMobileLayout, MapDesktopLayout, ListDesktopLayout)
5. Wire into app/page.tsx, replace existing imports
6. Delete old components (map-mini-card, map-desktop-card, map-list-view, filter-pills, etc.)

## Testing

- Integration: SearchBar → URL → re-render, Filter apply → URL → results, View toggle → layout switch
- Unit: ShopCardCompact data states + selected state, FilterTag active/inactive, CountHeader with counts, ViewToggle state
- E2E (deferred): Pin click → card highlight → shop detail flow

## Design Reference

- Mobile Map: `design.pen` node `c62Ni`
- Mobile Filter: `design.pen` node `vEqbC`
- Mobile List: `design.pen` node `MygeB`
- Desktop Map: `design.pen` node `5NK8A`
- Desktop List: `design.pen` node `g3tvu`
- Desktop Filter: `design.pen` node `e9U9r`
