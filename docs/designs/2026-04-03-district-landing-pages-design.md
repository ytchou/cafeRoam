# District Landing Pages — Design Doc

> **Ticket:** [DEV-201](https://linear.app/ytchou/issue/DEV-201)
> **Date:** 2026-04-03
> **Status:** Approved

---

## Goal

Create crawlable geo landing pages for Taiwan districts so CafeRoam ranks for high-intent local searches like "大安區咖啡廳推薦". At 160 shops and ~172 indexable pages, district pages are the primary SEO scale multiplier — each adds a unique content page without requiring new shop listings.

## Decisions

| Decision | Choice | Alternative Rejected | Why |
|----------|--------|---------------------|-----|
| District membership | FK on shops table + backfill | Geo bounding boxes at query time | Precise, queryable, no runtime computation; worth the one-time backfill effort |
| Rendering | Server component + ISR (5-min) | Client-side SWR (like vibes) | SEO is the primary goal; needs server-rendered HTML + generateMetadata for crawlers |
| Min threshold | 3 shops per district | 5 shops / no minimum | Low bar; most districts clear it at 160 shops. Avoids thin-content penalty |
| Vibe filter | Query param (`?vibe=study-cave`) | Separate routes per district x vibe | Simpler routing; avoids 150+ thin intersection pages |
| Explore page slot | Grid cards between Vibes and Community | Carousel / map picker | Matches existing vibes section layout; lowest implementation cost |
| Granularity | District first (大安區) | Neighborhood (Yongkang Street) | Density supports districts now; neighborhoods can be added later |

## Architecture

### Data Layer

**New `districts` table** (modeled after `vibe_collections`):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| slug | TEXT UNIQUE NOT NULL | URL slug, e.g. `da-an` |
| name_en | TEXT NOT NULL | e.g. `Da'an` |
| name_zh | TEXT NOT NULL | e.g. `大安區` |
| description_en | TEXT | SEO description |
| description_zh | TEXT | SEO description (zh) |
| city | TEXT NOT NULL DEFAULT 'taipei' | Parent city |
| sort_order | INT NOT NULL DEFAULT 0 | UI ordering |
| is_active | BOOLEAN NOT NULL DEFAULT true | Soft delete |
| shop_count | INT NOT NULL DEFAULT 0 | Denormalized count |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

**New FK on `shops`**: `district_id UUID REFERENCES districts(id)`, nullable, indexed.

**Backfill**: Parse `([\u4e00-\u9fff]+區)` from shop addresses, match to districts, batch update. ~5-10% of shops may need manual assignment.

**Seed**: ~12 Taipei districts (大安區, 中山區, 松山區, 信義區, 中正區, 萬華區, 大同區, 內湖區, 士林區, 北投區, 文山區, 南港區).

### Backend Layer

**`DistrictService`** (mirrors `VibeService`):
- `get_districts(min_shops=3)` — active districts with shop_count >= threshold
- `get_shops_for_district(slug, vibe_slug=None)` — shops where `district_id` matches, optional vibe filter via `shop_tags` join

**API endpoints** on explore router:
- `GET /explore/districts` — public, lists active districts
- `GET /explore/districts/{slug}/shops?vibe=` — public, shops in district

**Shop detail change**: Expose `district` object (`nameZh`, `slug`) in `GET /shops/{id}` response.

### Frontend Layer

**District landing page** (`app/explore/districts/[slug]/page.tsx`):
- Server component with `generateMetadata` — dynamic per-district title/description
- ISR data fetch via `BACKEND_URL` with `revalidate: 300`
- Client sub-component for vibe filter chips
- JSON-LD (`CollectionPage` schema)

**Explore page slot** (modify `app/explore/page.tsx`):
- "Browse by District" section — 6 grid cards (name_zh, name_en, shop count badge)
- Client-side `useDistricts()` SWR hook
- "See all" links to `/explore/districts`

**Shop detail** (modify `shop-detail-client.tsx`):
- "More cafes in [District]" link near bottom

**Sitemap**: Add district entries at priority 0.7.

## Components

```
districts table ──> DistrictService ──> GET /explore/districts
     │                    │                      │
     │                    └──> GET /districts/{slug}/shops
     │                                           │
shops.district_id                    ┌───────────┘
     │                               │
     ▼                               ▼
GET /shops/{id}              District landing page (SSR)
  + district field           ├── generateMetadata
     │                       ├── JSON-LD
     ▼                       └── Vibe filter (?vibe=)
Shop detail page
  "More in [District]"       Explore page
                             └── "Browse by District" grid
                                  └── useDistricts() SWR
```

## Testing Classification

- [x] New e2e journey? **No** — browse/discovery, not a critical transaction path
- [x] Coverage gate? **No** — new service, not in critical-path list (search, checkin, lists)

## Sub-issues

1. **DEV-204**: Foundation — districts table + shops FK + seed data (S, Foundation)
2. **DEV-205**: Backend — district service + API endpoints (M)
3. **DEV-206**: Frontend — district landing page SSR + ISR (M)
4. **DEV-207**: Frontend — Explore page district slots (S)
5. **DEV-208**: Frontend — "More in District" on shop detail (S)
