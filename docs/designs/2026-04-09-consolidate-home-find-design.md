---

# Design: Consolidate Home + Find Pages

**Date:** 2026-04-09
**Ticket:** DEV-281
**Status:** Approved

## Goal

Merge the Home page (`/`) and Find page (`/find`) into a single unified entry point at root `/`. The Find page's map/list layout becomes the primary structure; the DiscoveryPage's search hero and free search gate are added above it. The `/find` URL redirects permanently to `/`.

## Problem

Both pages serve as discovery entry points with search bars, creating navigation confusion. A visitor on the home page can search semantically but sees results as a flat list. On the Find page they can also search with its own bar and see results on a map. Having two separate routes for the same job fragments the experience and splits the UX across tabs.

## Decision

**Find becomes root `/`:** Promote the Find page layout (map + list + full spatial browsing) to the root route. Add the search hero (SearchBar, ModeChips, SuggestionChips) above the map/list area. Remove the standalone DiscoveryPage and redirect `/find` permanently to `/`.

### Alternatives Rejected

- **Home becomes unified `/`** — add map/list toggle below the search hero. Rejected because the Find page layout is more complete spatially; demoting the map to a toggle inside a search-centric list would reduce its prominence and require more layout surgery.
- **Redirect only** — keep both pages, just redirect one to the other. Rejected because the duplicate search bars and UX confusion remain.

## Architecture

### Unified Page Structure (`app/page.tsx`)

```
[Search Hero]
  SearchBar (semantic + keyword, autoFocus)
  ModeChips (work/rest/social/specialty)
  SuggestionChips (quick prompts + "near me")

[Map/List Area]
  MapWithFallback
    ├── Map view (Mapbox GL)
    └── List view (shop cards + filter sheet + geo-sort)
```

### Key Behaviors Preserved

1. **Free search gate:** Unauthenticated users get 1 free semantic search per session (localStorage key `caferoam_free_search_used`). Gate logic moves from `DiscoveryPage` into the unified root page. Authenticated users bypass the gate entirely.
2. **URL state:** `useSearchState` continues to manage `q`, `mode`, `filters`, `view` as URL search params at root `/`. Shareable URLs remain intact.
3. **Full-bleed layout:** AppShell's `isFindPage` condition shifts from `pathname === '/find'` to `pathname === '/'` — root gets no global header nav, no bottom nav, no footer (managed internally by the unified page).
4. **SEO:** `<WebsiteJsonLd />` JSON-LD schema stays on root page.
5. **Auth gate redirect:** `returnTo=/` links remain correct since the canonical discovery URL is still `/`.

### Navigation Changes

| Element    | Before                         | After                              |
| ---------- | ------------------------------ | ---------------------------------- |
| Bottom nav | 5 tabs: 首頁 地圖 探索 收藏 我 | 4 tabs: 首頁 探索 收藏 我          |
| Header nav | Includes 地圖 tab              | 地圖 tab removed                   |
| Submit CTA | On DiscoveryPage (`/`)         | Moved to Explore page (`/explore`) |

### Route Changes

| Route   | Before                                       | After                                 |
| ------- | -------------------------------------------- | ------------------------------------- |
| `/`     | DiscoveryPage (search hero + featured shops) | Unified page (search hero + map/list) |
| `/find` | Find page (map/list directory)               | 301 redirect → `/`                    |

## Components

| File                                      | Change                                      |
| ----------------------------------------- | ------------------------------------------- |
| `app/page.tsx`                            | Rewritten — unified root page               |
| `app/find/page.tsx`                       | Deleted — content merged into root          |
| `app/find/layout.tsx`                     | Deleted                                     |
| `components/discovery/discovery-page.tsx` | Deleted                                     |
| `components/navigation/app-shell.tsx`     | `pathname === '/find'` → `pathname === '/'` |
| `components/navigation/bottom-nav.tsx`    | Remove 地圖 tab (5 → 4 tabs)                |
| `components/navigation/header-nav.tsx`    | Remove 地圖 tab                             |
| `next.config.ts`                          | Add `/find` → `/` permanent redirect        |
| `app/explore/page.tsx`                    | Add submit CTA banner                       |

## Testing Classification

**(a) New e2e journey?**

- [x] Yes — root `/` now renders a different layout. E2E tests in `e2e/discovery.spec.ts` and `e2e/search.spec.ts` referencing `/find` must be updated to use `/`.

**(b) Coverage gate impact?**

- [x] Yes — `useSearch` and the free search gate are on the critical path. Gate unit tests migrate from `components/discovery/discovery-page.test.tsx` to `app/page.test.tsx`. Verify 80% coverage gate for the search path after the move.
