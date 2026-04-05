# Design: DEV-247 — VibePage All Shops + Collapsible Map

**Date:** 2026-04-05
**Status:** Approved
**Ticket:** [DEV-247](https://linear.app/ytchou/issue/DEV-247)

## Goal

Improve discovery on `/explore/vibes/[slug]` by removing the implicit "nearby only" filter and adding a map view so users can see where vibe-matching shops are located.

## Architecture

**Approach B — Reusable components.** Extract `DistrictChips` and `CollapsibleMapPanel` as shared components. VibePage composes them. DEV-245 (GPS fallback district picker) can reuse `DistrictChips`.

Backend already supports all-shops mode (no lat/lng = no bounding box filter), but needs:

1. `latitude`/`longitude` added to `VibeShopResult` response model
2. New optional `district_id` query param for district filtering

Frontend removes geo-gating from `useVibeShops` and composes the new components into VibePage.

## Components

| Component                 | Location                                   | Responsibility                                                                  |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `DistrictChips`           | `components/explore/district-chips.tsx`    | Horizontal chip row: 全部, ⊙ 附近, district names. Single-select.               |
| `CollapsibleMapPanel`     | `components/map/collapsible-map-panel.tsx` | MapView wrapper with expand/collapse toggle, height animation.                  |
| `VibePage` (modified)     | `app/explore/vibes/[slug]/page.tsx`        | Composes CollapsibleMapPanel + DistrictChips + shop list. Manages filter state. |
| `useVibeShops` (modified) | `lib/hooks/use-vibe-shops.ts`              | Accepts optional filter object (districtId, lat, lng). No longer blocks on geo. |

## Data Flow

```
User lands on /explore/vibes/first-date
  → useVibeShops(slug, { }) — no lat/lng, no district
  → GET /api/explore/vibes/first-date/shops (no geo params)
  → Backend: vibe_service returns all matching shops (up to 50) with lat/lng
  → Map renders pins for all shops, list shows all shops

User taps "⊙ 附近":
  → requestGeolocation()
  → useVibeShops(slug, { lat, lng })
  → Backend: applies bounding box → nearby shops only

User taps "大安" district chip:
  → useVibeShops(slug, { districtId: "daan-uuid" })
  → Backend: filters by district_id → shows only Daan shops
```

## Key Design Decisions

- **Map expanded by default** with option to collapse. Lightweight collapsible panel (250px), not the full-bleed /find map.
- **District chips + Near Me toggle** for filtering (全部 / ⊙ 附近 / district names). Single-select, mutually exclusive.
- **Bidirectional map-list sync:** pin click scrolls to card + highlights, card click highlights pin + flyTo.
- **Keep 50 result cap** — sufficient for single vibe category. Pagination deferred.
- **No new DB migration** — `shops.district_id` FK already exists (migration 20260404000002).

## Error Handling

- **Geo denied on "附近" tap:** Show toast "無法取得位置", revert to "全部" mode
- **Empty results for a district:** Show "此區域尚無符合的咖啡廳" empty state
- **Map load failure:** CollapsibleMapPanel auto-collapses, shows fallback — list still works

## Alternatives Rejected

- **Approach A (inline changes):** All changes directly in VibePage. Fast but no reuse for DEV-245 or other explore pages.
- **Approach C (shared explore layout):** Full shared layout for all explore sub-pages. Over-engineered for current needs (YAGNI).

## Testing Classification

- [ ] No — no new critical user path (vibe browsing is an existing path, just enhanced)
- [x] Yes — verify 80% coverage gate for `vibe_service` (already a critical-path service)

## SPEC Impact

Requires SPEC.md update:

- §2 System Modules: document new map surface on `/explore/vibes/[slug]`
- §9 Business Rules: add responsive layout entry for VibePage collapsible map
