# DEV-327: Review Source Attribution Design

**Date:** 2026-04-13  
**Status:** Approved  
**Ticket:** [DEV-327](https://linear.app/ytchou/issue/DEV-327)

## Overview

Add source attribution to review counts on the shop detail page. Users will see a polished RatingBadge component featuring laurel wreath decorations and explicit "X reviews on Google Maps" attribution text, building trust through data provenance transparency.

## Architecture

**Approach:** Frontend-only change. Create a new `RatingBadge` component with horizontal layout:

- Left side: Rating number + 5-star visualization + laurel wreath decorations
- Right side: Attribution text ("X reviews on Google Maps")

Hardcode "Google Maps" as the source per ADR-2026-04-13 (all review data comes from Google Maps via Apify scraping).

## Components

### New: `RatingBadge`

**File:** `components/shops/rating-badge.tsx`

**Props:**

- `rating: number | null` — The rating value (e.g., 4.8)
- `reviewCount: number | null` — Number of reviews
- `source?: string` — Attribution source (default: "Google Maps")
- `className?: string` — Additional CSS classes

**Behavior:**

- Returns `null` if `rating` or `reviewCount` is null/0
- Rounds rating to 1 decimal place for display
- Stars filled based on rounded rating (e.g., 4.2 → 4 filled stars)

### New: Laurel Wreath SVGs

**Files:**

- `components/ui/icons/laurel-left.tsx`
- `components/ui/icons/laurel-right.tsx`

Simple SVG components with `currentColor` fill for theming.

### Modified: `ShopIdentity`

**File:** `components/shops/shop-identity.tsx`

Replace inline rating display (`{rating} ★ ({reviewCount})`) with `<RatingBadge>` component.

## Data Flow

No backend changes required.

```
shop-detail-client.tsx
  └─> ShopIdentity (passes rating, reviewCount)
        └─> RatingBadge (renders styled display)
```

## Error Handling

| Condition                    | Behavior             |
| ---------------------------- | -------------------- |
| `reviewCount` is 0 or null   | Hide entire badge    |
| `rating` is null             | Hide entire badge    |
| Invalid rating (outside 0-5) | Clamp to valid range |

## Testing Strategy

**Unit tests** (`rating-badge.test.tsx`):

1. Renders rating number and attribution text when reviewCount > 0
2. Correct star fill based on rating value
3. Returns null for edge cases (0 reviews, null rating)
4. Laurel wreaths render correctly
5. Rating clamped to 1 decimal place

**Integration tests** (`shop-identity.test.tsx`):

1. ShopIdentity passes props to RatingBadge
2. RatingBadge renders within ShopIdentity layout

## Testing Classification

- [x] **New e2e journey?** No — display enhancement only
- [x] **Coverage gate impact?** No — UI component, not critical-path service
- [x] **E2E drift risk?** Possible — check `e2e/discovery.spec.ts` line 467 for `getByText('Google Maps')` matcher collision

## Visual Reference

Inspired by Brila hotel pages (https://hotel-emma.brila.ai/):

```
┌─────────────────────────────────────────────┐
│  🌿  4.8  🌿    120 reviews on Google Maps  │
│      ★★★★★                                  │
└─────────────────────────────────────────────┘
```

## Related

- **ADR:** [docs/decisions/2026-04-13-hardcode-google-review-source.md](../decisions/2026-04-13-hardcode-google-review-source.md)
- **Follow-up:** [DEV-331](https://linear.app/ytchou/issue/DEV-331) — Add community check-in count (deferred until traffic milestone)
