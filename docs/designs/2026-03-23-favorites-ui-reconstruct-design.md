# Design: Favorites UI Reconstruct

**Date:** 2026-03-23
**Status:** Approved
**Pencil frames:** `P7hXw` (mobile overview), `VtBgL` (desktop overview), `zG9ZS` (mobile detail), `Ik2pj` (desktop detail)

## Scope

Restyle `/lists` (overview) and `/lists/[listId]` (detail) to match approved Pencil designs. No new backend endpoints. Reuses `useUserLists`, existing `/api/lists/*` proxy routes. Adds interactive Mapbox maps to both pages.

## Architecture: Two Pages, Four Layouts

| Page | Mobile | Desktop |
|------|--------|---------|
| `/lists` overview | Vertical scroll: mini-map + list cards | Sidebar (420px) all lists' shops + full map |
| `/lists/[listId]` detail | Full map + fixed bottom sheet (~45%) | Collapsible left panel (420px) + full map |

## Page 1: Favorites Overview (`/lists`)

### Mobile Layout

- **Header**: "收藏" (Bricolage 28px bold) + "My Saved Lists" (Outfit 13px, `--text-tertiary`) + count badge ("2/3", `--map-pin` text on `#F5EDE4` bg, rounded-full)
- **Mini map**: 160px tall, rounded-20, interactive Mapbox showing pins from ALL saved shops. Colored pins per list. Bottom-right "N shops saved" badge (white pill, shadow).
- **Section header**: "My Lists" (Bricolage 18px bold) + green "+ New List" button (`#C8F0D8` bg, `#3D8A5A` text, rounded-full)
- **List cards**: White bg, rounded-20, subtle shadow, p-16, gap-12.
  - Top row: list name (Outfit 16px bold) + count + options button (32px circle, `#EDECEA`)
  - Photo row: 4 thumbnails (80x60, rounded-12) + "+N More" pill
  - Bottom row: green dot "Updated recently" + "View on map →" (`#3D8A5A`)
- **Empty slot card**: Dashed border (1.5px `--border-medium`), transparent bg, rounded-20. "Create a new list" + "N slot remaining" (`--text-tertiary`)
- **Bottom nav**: Existing BottomNav

### Desktop Layout

- **HeaderNav**: Existing component, "Favorites" tab active
- **Sidebar** (420px, border-right):
  - Title: "收藏 Favorites" + "New List" green button
  - List groups: shop rows (52px thumbnails, name + district/status, distance)
  - Selected row: left 3px border `--map-pin` + `--card-selected-bg`
  - "N more shops" expand link between groups
  - List headers with ellipsis menu
- **Map area**: Full remaining width, Mapbox, all lists' pins. Click row → highlight pin + auto-center.

## Page 2: List Detail (`/lists/[listId]`)

### Mobile Layout

- **Top overlay** (gradient white→transparent): Back chevron + list name (Outfit 16px bold) + "N shops" badge
- **Full-screen map**: Mapbox with coffee cup pins for this list only
- **Location button**: 44px circle, white bg, shadow, compass icon (bottom-right)
- **Fixed bottom sheet** (~45%): Gradient fade bg. Drag handle. List title + count. Scrollable shop rows (48px thumbnails, rounded-12, name + district/status, distance).
- **Bottom nav**: Existing BottomNav

### Desktop Layout

- **HeaderNav**: Existing component
- **Left panel** (420px, collapsible):
  - Back breadcrumb: "< My Favorites" (`--text-secondary`)
  - List title (Outfit 22px bold) + count
  - Divider
  - Shop rows (52px thumbnails, rounded-12, name 14px semibold + district/status 12px, distance)
- **CollapseToggle**: Existing component
- **Map area**: Full remaining width, Mapbox with this list's pins only

## Components

| Component | Status | Description |
|-----------|--------|-------------|
| `FavoritesListCard` | New | List card with photo thumbnails, options menu, "View on map" link |
| `EmptySlotCard` | New | Dashed-border placeholder for remaining list slots |
| `FavoritesMiniMap` | New | Interactive Mapbox mini-map (160px) showing all saved pins |
| `FavoritesShopRow` | New | Shop row (thumbnail + info + distance) for sidebar/bottom sheet |
| `FavoritesMobileLayout` | New | Mobile overview layout |
| `FavoritesDesktopLayout` | New | Desktop overview layout (sidebar + map) |
| `ListDetailMobileLayout` | New | Mobile detail (map + fixed bottom sheet) |
| `ListDetailDesktopLayout` | New | Desktop detail (collapsible panel + map) |
| `/lists/page.tsx` | Rewrite | Wire new layouts with `useIsDesktop` |
| `/lists/[listId]/page.tsx` | Rewrite | Wire new layouts, add Mapbox |

## Data Flow

- **Overview**: `useUserLists()` → lists + items. `GET /api/lists/pins` → pin coordinates for maps.
- **Detail**: `useUserLists()` for metadata. `GET /api/lists/{listId}/shops` → shop data for rows + pins.
- No new backend endpoints needed.

## Interactions

- Click list card / "View on map →" → navigate to `/lists/[listId]`
- Click shop row → (desktop) highlight row + map pin, auto-center; (mobile) highlight pin
- Options ⋯ → rename / delete (existing RenameListDialog)
- "+ New List" / empty slot click → inline creation
- Back chevron (detail) → navigate to `/lists`
- Mini map pin tap (overview mobile) → navigate to that list's detail

## Design System Compliance

- **Colors**: `--map-pin`, `--active-dark`, `--card-selected-bg`, `--text-secondary`, `--text-tertiary`, `--border-medium`
- **Typography**: Bricolage (headings), DM Sans/Outfit (UI), Inter (metadata)
- **Spacing**: 20px content padding, 12-16px gaps, 20px rounded corners
- **Reused components**: BottomNav, HeaderNav, CollapseToggle, MapView patterns
