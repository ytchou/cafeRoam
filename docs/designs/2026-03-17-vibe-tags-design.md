# Design: Vibe Tags — Browse by Mood (Explore Layer 2)

**Date:** 2026-03-17
**Status:** Approved
**Phase:** 3 — Explore Feature

---

## Overview

Vibe Tags is the second layer of the Explore tab, sitting below the Tarot Draw section. It exposes curated editorial presets — human-legible "moods" that combine existing taxonomy tags — so users can browse shops by feeling rather than by attribute. No new enrichment data is needed: vibes are a curation layer on top of the 82 existing taxonomy tags.

---

## Architecture

### Data Model

A `vibe_collections` table seeded via SQL migration. Schema:

```sql
CREATE TABLE vibe_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,           -- English display name
  name_zh       TEXT NOT NULL,           -- Traditional Chinese
  emoji         TEXT,
  subtitle      TEXT,                    -- 2–3 English keywords (e.g. "Quiet · WiFi")
  subtitle_zh   TEXT,                    -- 2–3 Chinese keywords
  tag_ids       TEXT[] NOT NULL,         -- References taxonomy tag IDs
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true
);
```

No RLS required (public read-only). Partial index on `is_active = true` for fast list queries.

### Matching Logic

**ANY-match + rank by overlap:**
- A shop must have ≥ 1 tag from `tag_ids` to appear in results
- Score = `matched_tag_count / total_tag_count_in_vibe` (0.0–1.0)
- Results sorted by `overlap_score DESC`, then `rating DESC` as tiebreaker
- Shops with `NULL latitude/longitude` excluded when geo filter is active

### Geo Handling

Same bounding-box + Haversine pattern as Tarot:
1. If `lat`/`lng` provided: apply bounding-box pre-filter in SQL (fast), then Haversine distance in Python
2. Results include `distance_km` when geo is available
3. Client may re-sort by distance; default sort is overlap score
4. No blocking location prompt on the results page — location is additive

Shops with `NULL` coordinates are excluded only when geo params are provided; otherwise they are included in city-wide results.

---

## Seed Vibe Collections (10 vibes)

| slug | name | name_zh | emoji | subtitle | tag_ids |
|---|---|---|---|---|---|
| `study-cave` | Study Cave | 讀書洞穴 | 📚 | Quiet · WiFi | `quiet, laptop_friendly, wifi_available, no_time_limit` |
| `first-date` | First Date | 約會聖地 | 💕 | Cozy · Pretty | `cozy, photogenic, soft_lighting, small_intimate` |
| `deep-work` | Deep Work | 專注工作 | ⚡ | Focus · Power | `laptop_friendly, power_outlets, no_time_limit, quiet` |
| `espresso-nerd` | Espresso Nerd | 咖啡控 | ☕ | Single-origin · Craft | `specialty_coffee_focused, self_roasted, pour_over, espresso_focused` |
| `hidden-gem` | Hidden Gem | 隱藏版 | 💎 | Off the map · Indie | `hidden_gem, alley_cafe, wenqing` |
| `weekend-brunch` | Weekend Brunch | 週末早午餐 | 🍳 | Lazy · Social | `food_menu, brunch_hours, lively, weekend_only` |
| `late-night-owl` | Late Night Owl | 夜貓基地 | 🌙 | Open late · Vibe | `late_night, open_evenings, good_music, lively` |
| `cat-cafe` | Cat Café | 貓咪咖啡 | 🐱 | Cats · Cozy | `has_cats, store_cat, cozy` |
| `slow-morning` | Slow Morning | 慢慢來 | 🌅 | Early · Quiet | `early_bird, slow_morning, quiet, soft_lighting` |
| `digital-nomad` | Digital Nomad | 遊牧工作者 | 💻 | Plugged in · All day | `laptop_friendly, power_outlets, wifi_available, all_day, no_time_limit` |

---

## Backend

### Files

| File | Role |
|---|---|
| `supabase/migrations/YYYYMMDD_vibe_collections.sql` | Table + seed data + index |
| `backend/models/types.py` | `VibeCollection`, `VibeShopResult` Pydantic models |
| `backend/services/vibe_service.py` | `VibeService` — list + shop matching logic |
| `backend/api/explore.py` | Two new routes added to existing explore router |

### API Endpoints

```
GET /explore/vibes
  Auth: none (public)
  Returns: list[VibeCollection] ordered by sort_order
  Response shape:
    [{ slug, name, nameZh, emoji, subtitle, subtitleZh }]

GET /explore/vibes/{slug}/shops
  Auth: none (public)
  Path: slug (str)
  Query: lat (float, optional), lng (float, optional), radius_km (float, default 5.0)
  Returns: VibeShopsResponse
  Response shape:
    {
      vibe: VibeCollection,
      shops: [{ shopId, name, slug, rating, coverPhotoUrl,
                distanceKm?, overlapScore, matchedTagLabels[] }],
      totalCount: int
    }
  Errors: 404 if slug not found
```

### VibeService Logic

```python
class VibeService:
    def get_vibes(self) -> list[VibeCollection]:
        # SELECT * FROM vibe_collections WHERE is_active = true ORDER BY sort_order

    def get_shops_for_vibe(
        self,
        slug: str,
        lat: float | None,
        lng: float | None,
        radius_km: float = 5.0,
    ) -> VibeShopsResponse:
        # 1. Fetch vibe by slug → 404 if not found
        # 2. Fetch live shops (with taxonomy_tags):
        #    - If lat/lng: bounding-box pre-filter (same as TarotService)
        #    - Else: all live shops city-wide
        # 3. For each shop: count tag overlap with vibe.tag_ids
        # 4. Filter: overlap_count >= 1
        # 5. Sort: overlap_score DESC, rating DESC
        # 6. If lat/lng: add distance_km via haversine
        # 7. Return top 50 results
```

---

## Frontend

### New Files

| File | Role |
|---|---|
| `lib/api/vibes.ts` | API client functions (`getVibes`, `getVibeShops`) |
| `hooks/use-vibes.ts` | SWR hook for `GET /explore/vibes` |
| `hooks/use-vibe-shops.ts` | SWR hook for `GET /explore/vibes/{slug}/shops` |
| `app/explore/vibes/[slug]/page.tsx` | Vibe results page |
| `app/api/explore/vibes/route.ts` | Next.js proxy |
| `app/api/explore/vibes/[slug]/shops/route.ts` | Next.js proxy |

### Explore Page (existing — wired up)

The `Vibe Tags Section` is already designed in Pencil (`UOZmR` frame, node `Byveh`). Wiring:
- `useVibes()` hook populates the 2×3 grid
- Each card: emoji icon + name + subtitle (from `subtitle` field)
- Tap → `router.push('/explore/vibes/[slug]')`
- "See all" → `router.push('/explore/vibes')` (out of scope for this feature)

### `/explore/vibes/[slug]` Results Page

Layout:
```
[Back arrow]  [emoji] Vibe Name / nameZh
              "N shops nearby" or "N shops found"

[Sort toggle: Best match | Nearest]  (nearest shown only if location available)

[ShopCard list]
  - cover photo + name + rating + distance badge (if geo) + matched tags

[Empty state: "No shops found for this vibe"]
```

Results page is client-rendered (uses `useVibeShops` SWR hook). Location is read from `navigator.geolocation` without a blocking prompt — graceful degradation if denied.

---

## Navigation Map

```
/explore (Explore page)
  └── Vibe card tap → /explore/vibes/[slug]  (results page)
                         └── Shop tap → /shops/[slug]  (existing shop detail)
  └── "See all" tap → /explore/vibes  (all vibes — OUT OF SCOPE, future design)
```

---

## Testing Strategy

### Backend (pytest, TDD)
- `test_vibe_service.py`:
  - `get_vibes()` returns ordered active vibes
  - `get_shops_for_vibe()` — overlap scoring (1/4, 2/4, 3/4, 4/4)
  - `get_shops_for_vibe()` — geo filter excludes null-coord shops
  - `get_shops_for_vibe()` — unknown slug raises 404
  - `get_shops_for_vibe()` — shops with zero overlap are excluded
- `test_explore_routes.py`:
  - `GET /explore/vibes` → 200, ordered list
  - `GET /explore/vibes/study-cave/shops` → 200 with results
  - `GET /explore/vibes/unknown-slug/shops` → 404
  - Geo params optional: works with and without lat/lng

### Frontend (Vitest)
- `use-vibes.test.ts`: fetch, loading state, error state
- `use-vibe-shops.test.ts`: fetch with/without geo, loading, error, empty state
- `vibes/[slug]/page.test.tsx`: renders shop list, distance badges when geo present, empty state

---

## Scope Boundaries

**In scope:**
- `vibe_collections` DB table + 10 seed vibes
- `GET /explore/vibes` and `GET /explore/vibes/{slug}/shops` endpoints
- `VibeService` with overlap scoring + geo filtering
- `useVibes` and `useVibeShops` hooks
- Explore page vibe strip wiring (existing Pencil design)
- `/explore/vibes/[slug]` results page

**Out of scope:**
- `/explore/vibes` all-vibes page (Pencil design pending)
- Admin UI for managing vibe collections
- Personalized vibe sorting or user-preference weighting
- Community Notes (Explore Layer 3)
- "See all" page implementation
