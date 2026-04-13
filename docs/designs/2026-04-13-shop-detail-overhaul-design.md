# DEV-332: Shop Detail Page Overhaul — Design

**Date:** 2026-04-13
**Ticket:** DEV-332
**Status:** Approved

---

## Problem

The shop detail page has several UX issues discovered during a live review of `/shops/072eb662-81a4-4a6e-8cf8-f9c38c2b9c40/_` (日淬 Sun Drip Coffee):

1. **Non-interactive Mapbox map** — static thumbnail with `interactive={false}` gives users a false affordance (they click expecting to pan/zoom, nothing happens)
2. **Missing social links** — Instagram URL exists in data but doesn't render in Links section
3. **Show More toggle** — "更多" button on description adds friction; most descriptions are short enough to show in full
4. **SEO noise in shop names** — Google Maps names like "日淬 Sun Drip Coffee (完整菜單可點instagram)" display raw to users
5. **Missing CTA labels** — Google Maps link card has no text label; users don't know what it does
6. **No Apple Maps link** — iOS users must copy-paste address to navigate

---

## Design Decisions

### 1. Map: Replace Mapbox with Google Maps Embed API (Place mode)

**Decision:** Replace `ShopMapThumbnail` (Mapbox) with a new `GoogleMapsEmbed` component using the Google Maps Embed API in Place mode.

**Rationale:**

- Mapbox `interactive={false}` is a dead UX element — misleads users into expecting interaction
- Enabling Mapbox interactivity (`interactive={true}`) works but adds no value over Google Embed, which includes a built-in place card (name, address, rating, hours, directions button)
- Google Embed API is free (unlimited usage) vs. Mapbox free tier (50K loads/month)
- Place mode (`/maps/embed/v1/place?q=place_id:{id}`) uses `google_place_id` we already store
- Fallback: View mode (`/maps/embed/v1/view`) if no `google_place_id` available

**Alternatives rejected:**

- **Remove map entirely:** Loses visual context that helps users orient before clicking through
- **Enable Mapbox interactivity:** Works but doesn't add value over Google Embed
- **View mode embed:** Less informative than Place mode (no place card)
- **Google Static Maps:** $2/1000 requests; same non-interactive UX as current

**Trade-off:** Google Embed shows Google's own rating/reviews — acceptable per user decision (users understand the distinction).

### 2. Shop Name Normalization: Both Layers

**Decision:** Normalize at both enrichment time (backend) and display time (frontend fallback).

**Pattern to strip:** Trailing parenthetical SEO noise:

- `(完整菜單可點instagram)` → strip
- `(wifi/插座/不限時)` → strip
- `(菜單/menu/IG)` → strip
- `(中山店)` → preserve (valid branch name)
- `(Zhongshan)` → preserve (valid branch name)

**Backend:** `normalize_shop_name()` in `backend/utils/text.py`, called in `persist.py` during enrichment.
**Frontend:** `normalizeShopName()` in `lib/utils/text.ts`, used in `shop-detail-client.tsx` at render time.

### 3. Photo Issue: Deferred (Data/Ops)

**Decision:** Not a code bug. The shop has no entries in `shop_photos` table — it was imported via `google_takeout` but never scraped. Frontend correctly shows initials fallback when `photoUrls` is empty. Fix: run scrape pipeline for pending shops (separate ticket).

---

## Architecture

### New Component: `GoogleMapsEmbed`

```
components/shops/google-maps-embed.tsx
├── Props: { googlePlaceId?: string | null, latitude: number, longitude: number, shopName: string }
├── If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set → renders "Map unavailable" fallback
├── If googlePlaceId → Place mode embed
└── Else → View mode embed (coordinates)
```

### Modified Files

| File                                               | Change                                                      |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `components/shops/google-maps-embed.tsx`           | **New** — Google Embed iframe component                     |
| `components/shops/shop-map-thumbnail.tsx`          | **Deleted**                                                 |
| `app/shops/[shopId]/[slug]/shop-detail-client.tsx` | Replace map, fix links, add labels, use normalizeShopName() |
| `components/shops/shop-description.tsx`            | Remove useState + "更多" button                             |
| `backend/utils/text.py`                            | **New** — normalize_shop_name()                             |
| `backend/workers/persist.py`                       | Call normalize_shop_name() at line 88                       |
| `lib/utils/text.ts`                                | **New** — normalizeShopName() frontend util                 |
| `.env.example`                                     | Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY                         |

---

## Testing Classification

- [ ] **New e2e journey?** No — shop detail page already tested
- [ ] **Coverage gate impact?** No — no critical-path service touched
- [x] **E2E drift risk?** Yes — Mapbox canvas selector (`.mapboxgl-canvas`) used in J04/J29 tests; Google Maps/Apple Maps link labels in J36. Must update `e2e/discovery.spec.ts` in same PR.

---

## Verification

1. Visit `/shops/{any-shop-id}/_` and verify:
   - Google Maps embed loads with Place card (if google_place_id exists)
   - Apple Maps link present with "Apple Maps" label
   - Instagram/website links render when data exists
   - Description shows full text (no "更多" toggle)
   - Shop names display without parenthetical noise
   - Google Maps CTA has "Google Maps" label text

2. Run `pnpm test` — all shop-detail tests pass
3. Run `pnpm lint && pnpm type-check` — no errors
4. Run `cd backend && uv run pytest` — all backend tests pass
5. Check E2E: `pnpm exec playwright test e2e/discovery.spec.ts --grep "J04|J36"`

---

## Post-Implementation Doc Updates

- **SPEC.md §1**: Note Google Maps Embed API added alongside Mapbox (Mapbox still used on `/find`)
- **PRD.md §7**: Update design handoff to reflect Google Maps embed instead of Mapbox thumbnail
