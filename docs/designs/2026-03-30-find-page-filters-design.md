# Design: Find Page Filters (DEV-113)

Date: 2026-03-30

## Problem

Filter buttons on the Find page (Open Now, WiFi, Outlet, Quiet, Top Rated) have no effect when clicked. Filter state is correctly managed in URL params via `useSearchState`, but:

1. Backend `list_shops` doesn't return `taxonomyTags` or `opening_hours` — only the detail endpoint does
2. Frontend `shops` memo in `app/page.tsx` only handles `rating` as a sort; all other filters are ignored

## Design Decisions

- **Client-side filtering** on the already-fetched ~170 shop array. No server-side filter params needed at this scale.
- **Backend computes `isOpen`** using existing `core.opening_hours.is_open_now()` — no frontend hours parsing.
- **Mapping table** for filter ID -> taxonomy tag ID (`wifi` -> `wifi_available`, `outlet` -> `power_outlets`). Keeps short URL params.
- **Filters are AND-combined** — a shop must match ALL active filters.

## Architecture

### Backend: Expand `list_shops` response

`backend/api/shops.py` — `list_shops()`:

- Add `shop_tags(tag_id, taxonomy_tags(id, dimension, label, label_zh))` join to query
- Add `opening_hours` to `_SHOP_LIST_COLUMNS`
- Compute `is_open_now()` per shop, return as `isOpen: boolean | null`
- Transform `taxonomyTags` array same as detail endpoint

### Frontend: Filter mapping

`components/filters/filter-map.ts` (new):

```ts
export const FILTER_TO_TAG_IDS: Record<string, string> = {
  wifi: 'wifi_available',
  outlet: 'power_outlets',
  quiet: 'quiet',
};
```

Special filters (not tag-based):
- `open_now` -> `shop.isOpen === true`
- `rating` -> sort by `shop.rating` descending

### Frontend: Apply filters in shops memo

`app/page.tsx` — `shops` useMemo:

1. Determine `base` array (search results or featured shops)
2. Partition `filters` into tag filters (via `FILTER_TO_TAG_IDS`) and special filters
3. For each tag filter: keep shops where `taxonomyTags` includes matching tag ID
4. For `open_now`: keep shops where `isOpen === true`
5. For `rating`: sort descending (existing behavior, applied after filtering)
6. Geo-sort applied last if location available

### Error handling

- `isOpen === null` (no hours data): excluded when `open_now` active, shown otherwise
- `taxonomyTags` empty/missing: excluded when any tag filter active, shown otherwise

## Files Changed

| File | Change |
|------|--------|
| `backend/api/shops.py` | Add tags join + opening_hours + isOpen to list endpoint |
| `components/filters/filter-map.ts` | New: FILTER_TO_TAG_IDS mapping |
| `app/page.tsx` | Apply filters in shops memo |

## Sub-issues

- **DEV-114**: Expand `list_shops` to return `taxonomyTags` and `isOpen` (S, Foundation)
- **DEV-115**: Add filter mapping and apply filters in shops memo (S, blocked by DEV-114)

## Testing

- Frontend: filter combinations in shops memo (single, multiple AND, open_now, rating+filter)
- Backend: verify list response includes `taxonomyTags` and `isOpen`

### Testing Classification

- [x] No new e2e journey — filters are part of existing Find page
- [x] No critical-path service touched

## Alternatives Rejected

- **Server-side filtering**: Adds re-fetch latency per toggle, unnecessary for ~170 shops
- **Rename filter IDs to match taxonomy**: Cleaner single source of truth, but shorter URL params preferred
- **Frontend hours parsing**: Duplicates Python logic, timezone risk
