# Navigation Restructure — Design

**Date:** 2026-03-16
**Status:** Approved
**Related:** [docs/designs/2026-03-16-explore-feature-design.md](2026-03-16-explore-feature-design.md)

---

## Decision

Replace the current 4-tab nav (首頁 / 地圖 / 收藏 / 我的) with a new 4-tab structure:

```
地圖 (/)  |  探索 (/explore)  |  收藏 (/lists)  |  我的 (/profile)
```

- **地圖** (`/`) — map only, replaces both Home and Map tabs
- **探索** (`/explore`) — new Explore tab (Tarot → Vibe Tags → Community)
- **收藏** (`/lists`) — unchanged
- **我的** (`/profile`) — unchanged

---

## Route Changes

| Before | After | Action |
|---|---|---|
| `app/page.tsx` (Home — featured grid, search hero) | `app/page.tsx` (map/Find) | Replace with map page content |
| `app/map/page.tsx` (Map) | — | Delete |
| `/map` | → `/` | Add permanent redirect in `next.config.ts` |
| — | `app/explore/page.tsx` | Create scaffold (populated in Tarot/Vibe/Community tasks) |

---

## Component Changes

### `app/page.tsx`
Content replaced with current `app/map/page.tsx`. Two items removed:
- `viewMode` state and map/list toggle button (list view moves to Explore)
- `MapListView` import and usage

### `components/navigation/bottom-nav.tsx`
```ts
const TABS = [
  { href: '/',        label: '地圖', icon: 'map' },
  { href: '/explore', label: '探索', icon: 'compass' },
  { href: '/lists',   label: '收藏', icon: 'heart' },
  { href: '/profile', label: '我的', icon: 'user' },
] as const;
```

### `next.config.ts`
```ts
redirects: async () => [
  { source: '/map', destination: '/', permanent: true },
],
```

---

## What's Dropped

| Removed | Reason |
|---|---|
| Home page (featured shops grid) | Replaced by map as landing experience |
| Search hero + suggestion chips | Lived only on Home |
| Mode chips on Home | Move to Explore page (Tarot/Vibe context) |
| Map/list view toggle | List view moves to Explore |

---

## Testing Checklist

- [ ] `/` loads map (not old Home)
- [ ] `/map` permanently redirects to `/`
- [ ] `/explore` renders without crashing
- [ ] Bottom nav active state correct on all 4 tabs
- [ ] No broken imports from deleted `app/map/page.tsx`
- [ ] `MapListView` component is still importable (used elsewhere or safely removable)
