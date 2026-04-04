# Design: Homepage Redesign — Search-First Discovery (DEV-197)

Date: 2026-04-04
Linear: DEV-197 (parent) · DEV-224 · DEV-225 · DEV-226 · DEV-227 · DEV-228 · DEV-229
Pencil mockups: `caferoam-design.pen` → "Homepage Redesign — DEV-197"

---

## Problem

The current homepage (`/`) is a full-screen map view. It communicates "directory" — the same as Google Maps. CafeRoam's actual differentiator is AI semantic search and intent-based discovery. A first-time visitor landing on a map of pins has no idea why CafeRoam is better than just opening Maps.

---

## Decision

**Option B (Search-First)** — chosen after visual comparison of three mockups (A: Intent+Search Hybrid, B: Search-First, C: Editorial+Search).

Rationale:
- Clean, uncluttered layout lets the AI search bar take center stage
- Mode chips (work/rest/social) serve as structured shortcuts without overwhelming the first impression
- Editorial option (C) was rejected — requires content pipeline that doesn't exist
- Intent-first option (A) doubles down on an unvalidated assumption that users think in modes

---

## Architecture: Two-Page Split

| Route | Page | Rationale |
|-------|------|-----------|
| `/` | Discovery + Search (new) | Lead with differentiator |
| `/find` | Map/Directory (relocated from `/`) | Spatial browsing, commodity utility |
| `/explore` | Explore tarot feature | Unchanged |
| `/search` | **Removed** | Absorbed into `/` |

---

## New Homepage Layout (Option B)

**Mobile (390px):**
- Brand mark "啡遊" in Terracotta `#E06B3F`
- Headline: "找到你的理想咖啡廳" (Bricolage Grotesque, 34px)
- Subheadline: "用 AI 語義搜尋，告訴我們你想要什麼"
- AI search bar with sparkle icon, terracotta accent glow, rounded-full
- Suggestion chips (`SuggestionChips` — reused from `/search`)
- Mode chips (`ModeChips` — finally wired to homepage, was orphaned)
- Divider
- Featured shops section ("精選咖啡廳") → scrollable list of `ShopCardCompact`
- "地圖瀏覽" link → navigates to `/find`
- Bottom nav: 首頁 · 探索 · 地圖 · 收藏 · 我的

**Desktop (≥1024px):** Centered layout, max-width constrained, same vertical stack.

---

## Bottom Navigation: 5 Tabs

| Tab | Label | Route | Icon |
|-----|-------|-------|------|
| 1 | 首頁 | `/` | Home |
| 2 | 探索 | `/explore` | Compass |
| 3 | 地圖 | `/find` | Map |
| 4 | 收藏 | `/lists` | Heart |
| 5 | 我的 | `/profile` | User |

---

## Auth Strategy

| Query Type | Unauthenticated |
|-----------|----------------|
| Name-based ("木下庵") | Always free |
| Semantic/vibe ("安靜工作") | 1 free try (localStorage: `caferoam_free_search_used`), then login gate |

After 1 free semantic search: gentle nudge "登入以繼續探索更多" → login redirect.

Backend: `Depends(get_current_user)` → `Depends(get_optional_user)` in `/api/search`.
Frontend: `fetchWithAuth` → `fetchOptionalAuth` in `useSearch` hook.

---

## Components

### New
- `components/discovery/discovery-page.tsx` — homepage layout component

### Reused (unchanged)
- `ModeChips` — wired in as secondary filter row
- `SuggestionChips` — moved from `/search` to homepage
- `ShopCardCompact` — featured shops listing
- `useSearchState` / `useSearch` / `useShops` — hooks

### Modified
- `components/navigation/bottom-nav.tsx` — 4 tabs → 5 tabs
- `backend/api/search.py` — optional auth
- `backend/api/deps.py` — add `get_optional_user`
- `lib/hooks/use-search.ts` — use `fetchOptionalAuth`
- `middleware.ts` — add `/find` to PUBLIC_ROUTES

### Removed
- `app/(protected)/search/page.tsx` — absorbed into `/`

---

## Alternatives Rejected

- **Option A (Intent+Search Hybrid):** Mode cards as primary hero. Doubles down on unvalidated assumption (ASSUMPTIONS #5: users think in modes). Rejected in favor of search bar prominence.
- **Option C (Editorial+Search):** Staff-picked lists as homepage. Requires manual editorial curation pipeline. Deferred — revisit if editorial content volume grows.
- **Single-page mode switch:** Keep one URL, switch between discovery and map states via URL params. Rejected — mixing two fundamentally different user intents on one page is the root problem we're solving.
