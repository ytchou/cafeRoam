# Design: Display community_summary on Shop Detail + Search Cards (DEV-34)

Date: 2026-03-26

## Overview

Surface the `shops.community_summary` column (populated by DEV-23's SUMMARIZE_REVIEWS pipeline) in the frontend as a "What visitors say" section on shop detail and a snippet on search cards.

## Architecture

Vertical slice — every layer touched with minimal changes at each:

```
DB (search_shops RPC) → API (column selections) → Frontend (types + components)
```

No new tables, endpoints, or business logic. Pure plumbing + rendering.

## Backend — API Column Changes

**`backend/api/shops.py`:**

- Add `community_summary` to `_SHOP_DETAIL_COLUMNS`
- Add `community_summary` to `_SHOP_LIST_COLUMNS`

**New migration — Update `search_shops` RPC:**

- Add `community_summary` to the SELECT list of the `search_shops()` Postgres function
- `CREATE OR REPLACE` the function in a new migration file

## Frontend — Type Updates

**`lib/types/index.ts`:**

- Add `community_summary: string | null` to the `Shop` interface
- `SearchResult` extends `Shop`, inherits the field automatically

## Frontend — Shop Detail Page

**New component: `components/shops/community-summary.tsx`**

- Section header: "What visitors say" with a sparkle icon
- Tooltip on the sparkle icon: "AI generated from visitor check-ins" (shadcn Tooltip)
- Body: summary text wrapped in 「」 quotation marks (pull-quote style)
- Conditional render: only when `community_summary` is truthy
- Placement: above the Reviews section in `shop-detail-client.tsx`

```
ShopHero
ShopActionsRow
── About ──────────────────
── Tags ──────────────────
── Hours ─────────────────
── Directions ─────────────
── What visitors say ✨ ────  ← NEW
  「顧客推薦拿鐵和巴斯克蛋糕，
   環境安靜適合工作。」
── Reviews ────────────────
```

## Frontend — Search Card Snippet

**`components/shops/shop-card-compact.tsx`:**

- Single line below location row, above attribute chips
- Truncate at 80 chars with ellipsis (`…`)
- Styled as muted secondary text (`text-muted-foreground`, `text-sm`)
- Conditional render: only when `community_summary` is truthy
- Cards without summary maintain current layout (no empty space)

```
┌───────────────────────────────┐
│ [photo]  Cafe Name   ★4.5    │
│          中山區 · 350m        │
│ 「顧客推薦拿鐵和巴斯克蛋糕，環境安…」│  ← NEW
│ ☕精品  🔌插座  📶WiFi       │
└───────────────────────────────┘
```

## Data Flow

```
shops.community_summary (populated by DEV-23 nightly worker)
    ↓
GET /shops/{id} → _SHOP_DETAIL_COLUMNS includes community_summary
GET /search     → search_shops RPC returns community_summary
    ↓
ShopDetailClient renders <CommunitySummary> above Reviews
ShopCardCompact renders truncated snippet line
```

## Error Handling

- `community_summary` is nullable — all rendering is conditional
- No loading states needed (arrives with shop data)
- No empty states — section simply doesn't render when null

## Testing

**Backend:**

- Update existing shop API tests to verify `community_summary` in responses
- Update search API tests to verify `community_summary` in search results

**Frontend:**

- `CommunitySummary` component: renders when present, hidden when null, tooltip accessible
- `ShopCardCompact`: renders snippet when present, truncates at 80 chars, hidden when null

### Testing Classification

**(a) New e2e journey?**

- [ ] No — adds content to existing shop detail and search flows, not a new critical path

**(b) Coverage gate impact?**

- [ ] No — doesn't touch critical-path services (search_service, checkin_service, lists_service)
