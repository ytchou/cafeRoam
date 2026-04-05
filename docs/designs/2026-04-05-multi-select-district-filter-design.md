# Multi-Select District Filter — Design Doc

**Ticket:** DEV-258
**Date:** 2026-04-05
**Hat:** CTO

## Goal

Convert the district filter on both the Explore page (DistrictPicker) and VibePage (DistrictChips) from single-select to multi-select, allowing users to browse shops across multiple neighboring districts simultaneously. "Near Me" remains mutually exclusive with district selection.

## Architecture

**Data flow change:** `string | null` → `string[]` at every layer:

```
DistrictPicker/DistrictChips (UI toggle)
  → Page state (string[])
    → useTarotDraw/useVibeShops hooks (build comma-separated param)
      → Proxy (passthrough, no changes)
        → FastAPI endpoint (parse comma string → list[str])
          → Service (`.in_("district_id", district_ids)` query)
```

## Design Decisions

- **Scope:** Both Explore page (DistrictPicker) AND VibePage (DistrictChips) get multi-select for consistent UX
- **API format:** Comma-separated `district_ids` param, matching existing `excluded_ids` pattern in the codebase
- **Toggle behavior:** Tapping a selected district deselects it; empty array + GPS available = auto Near Me
- **Near Me exclusivity:** Selecting Near Me clears all districts; selecting any district deactivates Near Me
- **No GPS fallback:** Prevent deselecting the last district when GPS is unavailable (must always have a filter active)
- **SWR cache stability:** Sort district IDs before joining for cache key (`a,b` always, never `b,a`)

## Alternatives Rejected

- **Repeated query params** (`district_id=a&district_id=b`): Standard HTTP convention but inconsistent with existing `excluded_ids` comma-separated pattern. Consistency with codebase wins.
- **Explore-only scope:** Would leave VibePage single-select, creating inconsistent UX across Explore sub-pages.
- **No toggle-off:** Once selected, districts could only be cleared via Near Me. Less intuitive for multi-select UX.

## Components

### Backend

- `backend/api/explore.py`: Rename param `district_id` → `district_ids` on `tarot_draw` and `vibe_shops` endpoints. Parse with same comma-split pattern as `excluded_ids`.
- `backend/services/tarot_service.py`: `_query_district_shops()` changes from `.eq("district_id", district_id)` to `.in_("district_id", district_ids)`. Method signature: `list[str]` instead of `str`.
- `backend/services/vibe_service.py`: `_fetch_shop_details()` same `.eq()` → `.in_()` change. `get_shops_for_vibe()` passes array through.

### Frontend Data Layer

- `lib/hooks/use-tarot-draw.ts`: Accept `districtIds?: string[] | null`. Build SWR key with sorted, comma-separated `district_ids` param.
- `lib/api/vibes.ts` + `lib/hooks/use-vibe-shops.ts`: Same param rename, build `district_ids` comma-separated in URL.

### Frontend Components

- `components/explore/district-picker.tsx`: Props change to `selectedDistrictIds: string[]` and `onToggleDistrict`. Highlight via `.includes()`.
- `components/explore/district-chips.tsx`: `VibeFilter` type changes `{ type: 'district'; districtId: string }` → `{ type: 'districts'; districtIds: string[] }`. Internal toggle logic: add/remove from array, revert to `{ type: 'all' }` when empty.

### Frontend Pages

- `app/explore/page.tsx`: State becomes `string[]`. Toggle handler adds/removes from array. Empty + GPS = Near Me. Empty + no GPS = prevent (guard against deselecting last).
- `app/explore/vibes/[slug]/page.tsx`: Update filter memo for new `districts` variant. Pass array to vibe shops hook.

## Data Flow

1. User taps a district pill → component fires toggle callback with district ID
2. Page handler adds/removes ID from `selectedDistrictIds` array
3. Derived state computes `effectiveDistrictIds` (or Near Me if empty + GPS)
4. Hook builds SWR key: `/api/explore/tarot-draw?district_ids=a,b,c&...`
5. Proxy passes through to backend
6. FastAPI parses comma string: `["a", "b", "c"]`
7. Service queries with `.in_("district_id", ["a", "b", "c"])`
8. Results returned, SWR caches by key

## Error Handling

- Empty district_ids + no lat/lng → 422 (existing validation, unchanged)
- Single district still works: `district_ids=abc` → `["abc"]`
- 200-row limit already present in both services, caps result set
- URL length: realistic 2-5 district UUIDs easily fit within limits

## Testing Strategy

- Update all existing single-select tests to array semantics
- Add multi-district tests at each layer (2+ districts)
- Frontend: test toggle on/off, multi-highlight, Near Me exclusivity
- Backend: test `.in_()` query with multiple district IDs
- No new e2e journey needed (filter behavior change on existing pages)

## Testing Classification

- [ ] New e2e journey? **No** — no new critical path introduced
- [x] Coverage gate impact? **Yes** — verify 80% coverage gate for `tarot_service` and `vibe_service`

## SPEC.md Updates

- §9 Geolocation fallback: Update "select any Taipei district" → "select one or more districts"
- §2 Explore module: Clarify district filter is multi-select
