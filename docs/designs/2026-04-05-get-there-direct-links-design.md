# Design: DEV-238 — Direct Google Maps + Apple Maps Links

**Date:** 2026-04-05
**Status:** Approved
**Ticket:** [DEV-238](https://linear.app/ytchou/issue/DEV-238)

## Goal

Replace the multi-step "Get There" directions flow (button → geolocation → Mapbox Directions API × 3 → drawer → external link) with two direct navigation links: Google Maps + Apple Maps.

## Architecture

### Current Flow (to be removed)

1. User taps "Get There" button
2. Browser requests geolocation permission
3. DirectionsSheet drawer opens
4. 3 parallel Mapbox Directions API calls (walking, driving, MRT-to-shop)
5. Route times displayed in drawer
6. User taps Google Maps or Apple Maps link at bottom

### New Flow

1. User taps "Google Maps" or "Apple Maps" link
2. External app/tab opens immediately

### URL Strategy

**Google Maps:**

- With `google_place_id`: `https://www.google.com/maps/dir/?api=1&destination={name}&destination_place_id={place_id}`
- Fallback: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`

**Apple Maps:**

- With address: `https://maps.apple.com/?daddr={encoded_address}`
- Fallback: `https://maps.apple.com/?daddr={lat},{lng}`

### Layout

Two side-by-side pill-style `<a>` links replacing the single "Get There" button. Same `border-border-warm` styling. Visible on both mobile (`lg:hidden` row) and desktop (`hidden lg:flex` row).

## Components

### Backend (1 line change)

Add `google_place_id` to `_SHOP_DETAIL_COLUMNS` in `backend/api/shops.py`. Already in DB and Pydantic model — just not returned by the API.

### Frontend

- New `lib/utils/maps.ts` — URL builder helpers (`getGoogleMapsUrl`, `getAppleMapsUrl`)
- Modified `shop-detail-client.tsx` — replace button with two `<a>` links, remove all directions state/imports

### Full Cleanup (deleted)

- `components/shops/directions-sheet.tsx` + test
- `components/shops/directions-inline.tsx`
- `app/api/maps/directions/route.ts`
- `backend/api/maps.py` + tests
- `get_directions` method from MapsProvider protocol + MapboxAdapter
- `DirectionsResult` model

## Error Handling

- No `google_place_id` → lat/lng fallback (always works)
- No address → lat/lng fallback for Apple Maps
- No lat/lng → hide links entirely (defensive, shouldn't happen)

## Testing Classification

- [ ] New e2e journey? No — no new critical path. J36 simplified to verify link targets.
- [ ] Coverage gate impact? No critical-path service touched.

## Alternatives Rejected

1. **Simplified sheet with link** — still an intermediate step, adds friction vs direct link
2. **Upgrade URLs only** — keeps unnecessary Mapbox API calls and geolocation overhead
3. **Single Google Maps button** — user requested Apple Maps option too
