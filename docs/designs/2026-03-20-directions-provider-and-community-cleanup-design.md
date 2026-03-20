# Design: Directions Provider + Community Notes Cleanup

**Date:** 2026-03-20
**Status:** Approved
**Scope:** Complete Shop View Directions via backend provider pattern; clean up stale Community Notes TODO items.

---

## Context

### Community Notes — Stale TODO

All Community Notes proxy routes are already implemented:

- `app/api/explore/community/preview/route.ts`
- `app/api/explore/community/route.ts`
- `app/api/explore/community/[checkinId]/like/route.ts`

The `[ ] Frontend: Proxy routes (preview, feed, like)` checkbox in TODO.md is stale. The only remaining item is the ops task to grant `blogger` role to beta invitees (manual SQL/admin action at launch time).

**Action:** Mark proxy routes as `[x]` in TODO.md. No code changes.

### Shop View Directions — Integration Gap

The `DirectionsSheet` component is fully built and tested. It calls Mapbox Directions API for walking/driving time, shows nearest MRT station, and has Google/Apple Maps deep-links. However:

1. **`useGeolocation()` hook exists but is not wired** into `shop-detail-client.tsx` — so `userLat`/`userLng` are never passed, and walking/driving times from the user's location never display.
2. **Mapbox Directions API is called directly from the browser** — violates the established provider abstraction pattern where external API calls go through backend adapters.

---

## Part 1: Community Notes — TODO Cleanup

No code changes. Mark completed in TODO.md:

```diff
- - [ ] Frontend: Proxy routes (preview, feed, like)
+ - [x] Frontend: Proxy routes (preview, feed, like)
```

---

## Part 2: Shop View Directions — Backend Provider + Frontend Wiring

### 2.1 Pydantic Model

Add to `backend/models/types.py`:

```python
class DirectionsResult(CamelModel):
    duration_min: int   # rounded minutes
    distance_m: int     # meters
    profile: str        # "walking" | "driving-traffic"
```

### 2.2 MapsProvider Protocol

Extend `backend/providers/maps/interface.py`:

```python
async def get_directions(
    self,
    origin_lat: float, origin_lng: float,
    dest_lat: float, dest_lng: float,
    profile: str,  # "walking" | "driving-traffic"
) -> DirectionsResult | None: ...
```

### 2.3 MapboxMapsAdapter Implementation

Add `get_directions` to `backend/providers/maps/mapbox_adapter.py`:

- Endpoint: `https://api.mapbox.com/directions/v5/mapbox/{profile}/{oLng},{oLat};{dLng},{dLat}`
- Query params: `access_token`, `overview=false`
- Parse `routes[0].duration` (seconds → rounded minutes) and `routes[0].distance` (meters)
- Return `DirectionsResult` or `None` on any failure
- Validate `profile` is one of `walking` or `driving-traffic`

### 2.4 API Endpoint

`GET /maps/directions` — **public, no auth required**

Query parameters:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `origin_lat` | float | yes | User latitude |
| `origin_lng` | float | yes | User longitude |
| `dest_lat` | float | yes | Shop latitude |
| `dest_lng` | float | yes | Shop longitude |
| `profile` | string | yes | `walking` or `driving-traffic` |

Response: `DirectionsResult` JSON (`{ durationMin, distanceM, profile }`)

Error cases:

- Invalid profile → 400
- Mapbox API failure → 502 (upstream error)
- Missing params → 422 (FastAPI default)

### 2.5 Next.js Proxy Route

`app/api/maps/directions/route.ts` — thin proxy forwarding query params to `GET /maps/directions`.

### 2.6 DirectionsSheet Refactor

Replace direct Mapbox `fetch()` calls in `fetchRoute()` with calls to `/api/maps/directions`:

```typescript
// Before: direct Mapbox call
const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${fromLng},${fromLat};${toLng},${toLat}?access_token=${token}&overview=false`;

// After: backend proxy
const params = new URLSearchParams({
  origin_lat: String(fromLat),
  origin_lng: String(fromLng),
  dest_lat: String(toLat),
  dest_lng: String(toLng),
  profile,
});
const url = `/api/maps/directions?${params}`;
```

- Remove `NEXT_PUBLIC_MAPBOX_TOKEN` dependency from DirectionsSheet
- `NEXT_PUBLIC_MAPBOX_TOKEN` remains for map rendering (MapView, ShopMapThumbnail — client-side mapbox-gl)

### 2.7 Shop Detail Geolocation Wiring

In `app/shops/[shopId]/[slug]/shop-detail-client.tsx`:

1. Import `useGeolocation` hook
2. Request location when DirectionsSheet opens (not on page load — avoids premature permission prompt)
3. Pass `userLat={latitude}` and `userLng={longitude}` to DirectionsSheet

```tsx
const { latitude, longitude, requestLocation } = useGeolocation();

const handleDirectionsOpen = () => {
  requestLocation();
  setDirectionsOpen(true);
};

<DirectionsSheet
  open={directionsOpen}
  onClose={() => setDirectionsOpen(false)}
  shop={directionsShop}
  userLat={latitude ?? undefined}
  userLng={longitude ?? undefined}
/>
```

The sheet will initially show MRT info only (no user location yet), then re-fetch with walking/driving times once geolocation resolves. This is handled by the existing `useEffect` in DirectionsSheet that watches `userLat`/`userLng` changes.

---

## Mapbox Token Strategy

| Token | Location | Used by |
|-------|----------|---------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Frontend `.env.local` | mapbox-gl (map rendering), ShopMapThumbnail (static images) |
| `MAPBOX_ACCESS_TOKEN` | Backend `.env` | MapboxMapsAdapter (geocoding, reverse geocoding, **directions**) |

DirectionsSheet moves from using the frontend public token to using the backend server token via the proxy.

---

## Testing Strategy

**Backend (TDD):**

- `test_mapbox_adapter.py`: Test `get_directions` with mocked httpx responses (success, API failure, malformed response)
- `test_maps_api.py`: Test `GET /maps/directions` endpoint (valid request, invalid profile → 400, upstream failure → 502)

**Frontend:**

- Update `directions-sheet.test.tsx`: Mock `/api/maps/directions` instead of direct Mapbox URL
- Add test in `shop-detail-client.test.tsx`: Verify DirectionsSheet receives geolocation props after "Get There" tap

---

## Files Changed

| File | Change |
|------|--------|
| `TODO.md` | Mark Community Notes proxy routes as done |
| `backend/models/types.py` | Add `DirectionsResult` |
| `backend/providers/maps/interface.py` | Add `get_directions` to protocol |
| `backend/providers/maps/mapbox_adapter.py` | Implement `get_directions` |
| `backend/api/maps.py` | New router with `GET /maps/directions` |
| `backend/main.py` | Register maps router |
| `backend/tests/providers/test_mapbox_adapter.py` | Directions adapter tests |
| `backend/tests/api/test_maps_api.py` | New API test file |
| `app/api/maps/directions/route.ts` | New proxy route |
| `components/shops/directions-sheet.tsx` | Replace Mapbox fetch with proxy calls |
| `components/shops/directions-sheet.test.tsx` | Update mocks |
| `app/shops/[shopId]/[slug]/shop-detail-client.tsx` | Wire useGeolocation + pass props |

---

## Non-Goals

- MRT→shop walking time caching (good future optimization, not needed now)
- Backend directions for map page "Near Me" (uses client-side geolocation + Mapbox GL, different pattern)
- Removing `NEXT_PUBLIC_MAPBOX_TOKEN` entirely (still needed for map rendering)
