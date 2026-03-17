# Tarot — Surprise Me: Implementation Design

**Date:** 2026-03-17
**Status:** Approved
**Implements:** [2026-03-17-explore-tarot-redesign.md](2026-03-17-explore-tarot-redesign.md)

---

## Architecture Overview

Four parallel work streams:

| Stream                 | Layer    | Key deliverables                                                                           |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------ |
| **A. DB + Enrichment** | Backend  | Migration for `tarot_title`/`flavor_text`, enrichment prompt update, `is_open_now` utility |
| **B. API Endpoint**    | Backend  | `GET /explore/tarot-draw` + Next.js proxy route                                            |
| **C. Frontend Core**   | Frontend | Tarot card components, SWR hook, page assembly                                             |
| **D. Share Card**      | Frontend | Canvas-based image generation for Threads/IG share                                         |

---

## Component Tree

```
app/explore/page.tsx (server)
└── ExploreClient (client)
    ├── TarotSection
    │   ├── TarotSpread              ← 3-card container + "Draw Again" button
    │   │   └── TarotCard × 3       ← face-down horizontal card (tap → opens modal)
    │   ├── TarotRevealDrawer        ← full-screen Vaul drawer (revealed shop)
    │   │   ├── ShopHero (reuse)     ← shop photo, full bleed
    │   │   ├── TarotRevealContent   ← title, shop name, flavor text, metadata
    │   │   └── TarotActions         ← "Share My Draw" / "Let's Go" / close
    │   └── TarotEmptyState          ← when no shops match
    └── (future: VibeSection, CommunitySection)
```

---

## Data Flow

```
[Page Load]
  → useGeolocation() → { lat, lng }
  → useTarotDraw(lat, lng) [SWR hook]
    → GET /api/explore/tarot-draw?lat=...&lng=...&radius_km=3
      → proxyToBackend → GET /explore/tarot-draw (FastAPI)
        → TarotService.draw(lat, lng, radius_km, excluded_ids)
          → PostGIS distance filter + is_open_now check
          → Random sample 3, ensure unique tarot_titles
          → Return full shop data (held by frontend, hidden until tap)
  → Render 3 face-down TarotCards (showing only tarot_title)
  → [User taps card]
    → Open TarotRevealDrawer with full shop data (no second fetch)
    → Track in localStorage: add shop_id to recently-seen list (cap at 9)
  → [Draw Again]
    → mutate() SWR cache → re-fetch with updated excluded_ids from localStorage
```

---

## Backend

### A. Database Migration

```sql
ALTER TABLE shops ADD COLUMN tarot_title TEXT;
ALTER TABLE shops ADD COLUMN flavor_text TEXT;
```

No index needed — we query by location first, then filter in application code on a small candidate set (50–200 shops within radius).

### B. `is_open_now` Utility

**File:** `backend/core/opening_hours.py`

Parses the `list[str]` format stored by scrapers (e.g., `"Monday: 9:00 AM - 6:00 PM"`). Returns `bool` for a given shop at the current time. All shops are in `Asia/Taipei` timezone.

Edge cases handled:

- 24-hour shops
- Closed days (no entry for that weekday)
- Midnight-crossing hours (e.g., `"Friday: 10:00 AM - 2:00 AM"`)
- Missing/null `opening_hours` → treated as "unknown" (included in results)

**Decision:** Python utility over Supabase RPC function. The candidate set is small (post-geo-filter), so application-side parsing is simpler and easier to unit test.

### C. TarotService

**File:** `backend/services/tarot_service.py`

```python
class TarotService:
    def __init__(self, db: Client):
        self._db = db

    async def draw(
        self, lat: float, lng: float, radius_km: float, excluded_ids: list[str]
    ) -> list[dict]:
        # 1. Query shops within radius (RPC or postgrest geo filter)
        #    SELECT * FROM shops WHERE ST_DWithin(...)
        #    AND tarot_title IS NOT NULL
        #    AND id NOT IN (excluded_ids)
        # 2. Filter is_open_now in Python
        # 3. Group by tarot_title, pick one random shop per title
        # 4. Random sample 3 from unique-title pool
        # 5. Calculate distance_km for each
        # 6. Return TarotDrawResponse list
```

### D. API Endpoint

**File:** `backend/api/explore.py`

```python
router = APIRouter(prefix="/explore", tags=["explore"])

@router.get("/tarot-draw")
async def tarot_draw(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=3.0, ge=0.5, le=20.0),
    excluded_ids: str = Query(default=""),  # comma-separated shop IDs
) -> list[dict]:
```

**Auth:** Public (no auth required). Directory browsing is public per SPEC. Recently-seen tracking is client-side for V1.

### E. Enrichment Update

Extend the existing `ENRICH_SHOP` handler to generate `tarot_title` + `flavor_text`:

- Add to the Claude tool schema so it picks the best-fitting title from the fixed vocabulary
- `flavor_text` generated per-shop (one line, evocative)
- Stored alongside existing enrichment fields

### F. Pydantic Response Model

```python
class TarotCard(CamelModel):
    shop_id: str
    tarot_title: str
    flavor_text: str
    is_open_now: bool
    distance_km: float
    name: str
    neighborhood: str
    cover_photo_url: str | None = None
    rating: float | None = None
    review_count: int = 0
    slug: str | None = None
```

---

## Frontend

### A. SWR Hook

**File:** `lib/hooks/use-tarot-draw.ts`

```typescript
export function useTarotDraw(lat: number | null, lng: number | null) {
  const excludedIds = getRecentlySeenIds(); // from localStorage
  const key =
    lat && lng
      ? `/api/explore/tarot-draw?lat=${lat}&lng=${lng}&radius_km=3&excluded_ids=${excludedIds.join(',')}`
      : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetchPublic, {
    revalidateOnFocus: false,
  });
  return { cards: data ?? [], isLoading, error, redraw: mutate };
}
```

### B. TarotCard Component

- Horizontal layout: `w-full h-[140px]`
- Dark espresso background: `bg-[#2C1810]`
- Warm gold double border (ornamental)
- Title: all-caps, centered, `text-[#C4922A]`, Bricolage Grotesque font
- Staggered entrance animation via CSS `animation-delay`
- Revealed state: `opacity-60` + "✓ Revealed" badge bottom-right
- Still tappable when revealed (re-opens drawer)

### C. TarotRevealDrawer

- Full-screen Vaul Drawer (`snapPoints={[1]}`)
- Layout: ornamental header → photo (full bleed) → tarot title (large) → shop name → metadata → flavor text → action buttons
- Actions:
  - "Let's Go" → `router.push(/shops/{id}/{slug})`
  - "Share My Draw" → generate share card
  - Close (X or swipe down) → return to spread

### D. Share Card Generation

**Approach:** Client-side Canvas API via `html2canvas`

- Renders a hidden DOM element styled as the share card (1080×1920 portrait)
- Content: CafeRoam branding + shop photo + tarot title + shop name + neighborhood + date
- No app chrome — just the card
- On mobile: `navigator.share({ files: [blob] })` → native share sheet
- On desktop: fallback to file download

### E. Font Addition

- **Bricolage Grotesque** via `next/font/google`
- Scoped to tarot components only (CSS variable)
- Fallback chain: Geist Sans → system sans-serif

### F. Recently-Seen Tracking (V1: Client-Side)

- `localStorage` key: `caferoam:tarot:seen`
- Value: JSON array of shop IDs, capped at 9 (last 3 draws)
- Sent as `excluded_ids` query param to backend
- On "Draw Again": append current 3 IDs, then re-fetch via `mutate()`
- When all nearby shops exhausted: auto-clear and start fresh

---

## Edge Cases

| Scenario                        | Behavior                                               |
| ------------------------------- | ------------------------------------------------------ |
| Location denied                 | "Enable location to discover nearby cafes." No cards.  |
| No shops open within radius     | `TarotEmptyState` with "Expand radius" button (→ 10km) |
| Fewer than 3 unique-title shops | Return 1–2 cards. Frontend adapts layout.              |
| No `tarot_title` on any shop    | Same as empty state (enrichment must run first)        |
| Network error                   | SWR error → "Couldn't load your draw. Tap to retry."   |
| All nearby shops seen           | Auto-clear localStorage seen list, re-draw             |

---

## Analytics Events

| Event                | Properties                                | Trigger            |
| -------------------- | ----------------------------------------- | ------------------ |
| `tarot_draw_loaded`  | `card_count`, `lat`, `lng`                | 3 cards rendered   |
| `tarot_card_tapped`  | `shop_id`, `tarot_title`, `card_position` | Card reveal        |
| `tarot_share_tapped` | `shop_id`, `share_method`                 | Share button       |
| `tarot_lets_go`      | `shop_id`                                 | Navigate to shop   |
| `tarot_draw_again`   | —                                         | Draw Again button  |
| `tarot_empty_state`  | `lat`, `lng`, `radius_km`                 | No shops available |

---

## Testing Strategy

### Backend (pytest)

| Test file               | Coverage                                                  |
| ----------------------- | --------------------------------------------------------- |
| `test_opening_hours.py` | Standard hours, 24h, closed days, midnight crossing, null |
| `test_tarot_service.py` | Title uniqueness, exclusion, radius, fewer-than-3, empty  |
| `test_explore_api.py`   | Response shape, query param validation, integration       |

### Frontend (Vitest + Testing Library)

| Test file                    | Coverage                                          |
| ---------------------------- | ------------------------------------------------- |
| `TarotSpread.test.tsx`       | Renders cards, tap opens drawer, draw again works |
| `TarotCard.test.tsx`         | Displays title, revealed state styling            |
| `use-tarot-draw.test.ts`     | SWR hook with mock data, null coords              |
| `TarotRevealDrawer.test.tsx` | Shop data display, action buttons                 |

---

## Out of Scope (V1)

- Server-side share image generation (Satori/OG)
- Authenticated recently-seen tracking (DB)
- Claude-generated runtime flavor text
- Shake-to-draw gesture
- Card flip animation (implement in code later, not designed here)
