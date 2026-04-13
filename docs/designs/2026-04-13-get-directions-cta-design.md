# Get Directions CTA Design

**Date:** 2026-04-13  
**Ticket:** DEV-328  
**Status:** Approved

## Goal

Add a "Get Directions" button to the shop detail page above the fold, improving conversion for the #1 user intent: "how do I get there?"

## User Story

As a user viewing a shop detail page, I want a prominent "Get Directions" button near the top so that I can quickly navigate to the shop without scrolling through all content.

## Design Decisions

### 1. Visual Hierarchy
**Decision:** Icon button style (same as Save/Share)  
**Alternatives rejected:**
- Secondary outlined button — user preferred single-row layout with icons
- Tertiary/link style — too minimal, doesn't feel like a CTA

### 2. Placement
**Decision:** Inside ShopActionsRow alongside Check In  
**Alternatives rejected:**
- Standalone button below ShopIdentity — separates from other actions
- Replace Links section — not "above the fold"

### 3. Interaction
**Decision:** Direct link to Google Maps (opens in new tab)  
**Alternatives rejected:**
- Bottom sheet with Google Maps + Apple Maps options — extra tap, adds complexity
- OS-native share/maps picker — inconsistent browser support

### 4. Layout
**Decision:** Single horizontally scrollable row with all buttons  
**Alternatives rejected:**
- Two-row layout (Check In row + icon buttons row) — user preferred single row
- Side-by-side primary buttons — requires more width

## UI Specification

### Button Spec
| Property | Value |
|----------|-------|
| Icon | Navigation (lucide-react) |
| Size | 44x44px (`h-11 w-11`) |
| Style | `rounded-full border border-border-warm bg-white` |
| Action | Opens `googleMapsUrl` in new tab |
| Conditional | Only renders if shop has coordinates |
| Accessibility | `aria-label="Get Directions"` |

### Layout (Mobile)
```
[Nav] [Check In] [Save] [Share] [Follow] [Report]
      └─── scrollable on narrow screens ───┘
```

## Data Flow

```
shop-detail-client.tsx
├── googleMapsUrl = useMemo(() => getGoogleMapsUrl(shop), [shop])  // Already exists
└── <ShopActionsRow googleMapsUrl={googleMapsUrl} />  // NEW prop

shop-actions-row.tsx
├── Props: { googleMapsUrl?: string, ... }  // NEW prop
└── {googleMapsUrl && <a href={googleMapsUrl} ...><Navigation /></a>}  // NEW button
```

## Testing Classification

- [ ] **New e2e journey?** No — not a new critical path
- [ ] **Coverage gate impact?** No — no critical-path service touched
- [x] **E2E drift risk?** No — new button doesn't modify existing selectors

## References

- Inspiration: Brila hotel pages (CTA hierarchy)
- Related: DEV-252 (Maps links to place page), DEV-322 (desktop layout fixes)
