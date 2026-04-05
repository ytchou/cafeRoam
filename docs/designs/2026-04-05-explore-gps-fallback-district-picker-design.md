# DEV-245: Explore GPS Fallback + District Picker — Design

**Date:** 2026-04-05
**Ticket:** [DEV-245](https://linear.app/ytchou/issue/DEV-245)
**Status:** Approved
**Hat:** CTO

---

## Context

When GPS access is denied on `/explore`, the "Your Daily Draw" (Tarot) section shows a dead-end "Enable location" prompt with no alternative path. This undermines the core discovery "wow moment" and blocks non-GPS users entirely — particularly problematic given that the beta cohort may include users outside Taipei (ASSUMPTIONS.md B3).

## Decision

**Combined A+B approach:** Always-visible district pill selector above "Your Daily Draw" with two location modes:

- **"Near Me"** (default when GPS available) — uses GPS lat/lng, existing bounding-box query
- **District selection** — passes `district_id` to backend, filters shops by `shops.district_id` FK (more precise than bounding box)

When GPS is denied, "Near Me" is disabled/dimmed and the picker defaults to the first available district. No dead-end state.

## Architecture

### Backend

**`GET /explore/tarot-draw` parameter changes:**

| Param | Before | After |
|-------|--------|-------|
| `lat` | `float` (required) | `float \| None` (optional) |
| `lng` | `float` (required) | `float \| None` (optional) |
| `radius_km` | `float` (default 3.0) | unchanged |
| `excluded_ids` | `str` (default "") | unchanged |
| `district_id` | — | `str \| None` (optional, new) |

**Validation:** Require either `(lat + lng)` OR `district_id`. Return 422 if neither provided.

**`TarotService.draw()` changes:**
- New signature: `draw(self, lat, lng, radius_km, excluded_ids, now, district_id=None)`
- When `district_id` provided: new `_query_district_shops(district_id)` method filters by `.eq("district_id", district_id)` instead of bounding box
- When lat/lng provided: existing `_query_nearby_shops` unchanged
- `distance_km` set to `0.0` for district-mode cards (no reference point)
- `_to_card` updated: `user_lat`/`user_lng` optional, defaults `distance_km=0.0` when None

### Frontend

**New component: `components/explore/district-picker.tsx`**
- Horizontally scrollable pill/chip row
- "Near Me" pill: highlighted when GPS active, disabled+dimmed when GPS denied
- District pills from `useDistricts()` data
- Props: `districts: District[]`, `selectedDistrictId: string | null`, `gpsAvailable: boolean`, `isNearMeActive: boolean`, `onSelectDistrict: (id: string) => void`, `onSelectNearMe: () => void`

**`useTarotDraw` hook changes:**
- New signature: `useTarotDraw(lat, lng, districtId?: string | null)`
- SWR key: when `districtId` present → `/api/explore/tarot-draw?district_id=${districtId}&...`; when `lat && lng` → existing URL; otherwise `null`

**`ExplorePage` changes:**
- New state: `selectedDistrictId: string | null`, `isNearMeMode: boolean`
- When GPS available: `isNearMeMode = true` by default
- When GPS denied: `isNearMeMode = false`, auto-select first district
- District picker rendered above "Your Daily Draw" heading
- `geoError` dead-end replaced with district picker fallback

**`TarotEmptyState` changes:**
- New optional prop: `onTryDifferentDistrict?: () => void`
- When provided, renders "Try a different district" as secondary button

## Alternatives Rejected

1. **Option A only (silent Taipei fallback):** Serves fake "nearby" results without telling the user. Misleading UX, especially for non-Taipei beta users.
2. **Frontend-only coord resolution:** Frontend resolves district → center lat/lng and passes to unchanged endpoint. Less precise than FK filter; backend still does unnecessary bounding-box math.
3. **Fallback-only picker:** District picker only shown when GPS denied. Limits discoverability of district browsing for GPS users.

## Testing Classification

- [x] No — no new critical user path introduced (enhances existing explore flow)
- [x] Yes — verify 80% coverage gate for `tarot_service` district_id path

## SPEC Update Required

Add to SPEC.md §9 Business Rules:
> **Geolocation fallback:** When geolocation is unavailable, the Explore page defaults to a district picker. Users can select any Taipei district to scope Tarot Draw results. The district picker is always visible regardless of GPS state, with "Near Me" as the default when GPS is available.
