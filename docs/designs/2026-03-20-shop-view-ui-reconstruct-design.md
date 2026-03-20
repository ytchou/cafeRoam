# Design: Shop View UI Reconstruct

**Date:** 2026-03-20
**Status:** Approved
**Pencil frames:** `3hOsp` (Shop View), `ENKsc` (Directions), `6Wn4A` (Check In Sheet), `y52Ff` / `udpQf` / `rgu49` (Save to List ×3 states), `Y5qyD` (Share), `2i6ge` (Desktop), `C0sGo` / `iQfwr` / `I2r82` (Desktop Popovers)

---

## Context

The Shop View is the core conversion screen — it's where a user decides to check in, save, or share a shop. The current implementation is functional but uses ad-hoc styling. This reconstruct replaces it with the Pencil-approved design system: new layout, actions row, hero overlay buttons, claim banner, and desktop popovers.

---

## SPEC Change

**Section 9 (Business Rules) — Check-in page is standalone** is superseded by this design. The check-in flow now lives as a bottom sheet on Shop View (mobile) and a popover (desktop). The standalone `/checkin/[shopId]` page is kept as a fallback for deep-links. SPEC.md §9 will be updated after this PR merges.

---

## Architecture

### Approach: In-place restyling with additive new components

Keep all existing component files and restyle in-place. Add new files only where genuinely new behaviour is introduced (`CheckInSheet`, `ShopActionsRow`, `ClaimBanner`, 3 desktop popovers). This minimises test churn and avoids duplication.

### Layout

**Mobile (< 1024px):**
```
ShopHero (full-width, aspect-video)
  └── floating overlay: back button + bookmark icon + share icon
ShopActionsRow (Check In primary CTA + Save icon + Share icon)
ShopDescription (About section)
AttributeChips (Tags section)
HoursSection
DirectionsSheet (trigger: inline "Directions" row)
ReviewsSection (See all link)
ClaimBanner
```

**Desktop (≥ 1024px):**
```
TopNav (existing HeaderNav)
Breadcrumb strip (Find → Shop Name)
Hero (full-width, 260px)
ShopInfo (name, rating, open status, address)
ShopActionsRow (same component, wider layout)
About, Tags, Hours & Info
Directions (inline map + walk/drive/MRT rows + Google/Apple Maps buttons)
Reviews
ClaimBanner
```

No sticky sidebar map on desktop — the Pencil design uses a single left-column layout with inline directions section. The existing `ShopMapThumbnail` component is reused inside the directions section.

---

## Components

### Modified in-place

| Component | File | Changes |
|---|---|---|
| `ShopHero` | `components/shops/shop-hero.tsx` | Add floating back / bookmark / share button overlay |
| `ShopIdentity` | `components/shops/shop-identity.tsx` | Add open-status badge, distance pill, address line |
| `ShopDescription` | `components/shops/shop-description.tsx` | Section header "About"; restyle |
| `AttributeChips` | `components/shops/attribute-chips.tsx` | Section header "Tags"; restyle |
| `DirectionsSheet` | `components/shops/directions-sheet.tsx` | Visual polish to match frame `ENKsc`; logic unchanged |
| `SaveToListSheet` | `components/lists/save-to-list-sheet.tsx` | Restyle 3 states (has lists / no lists / cap reached) to match frames `y52Ff`, `udpQf`, `rgu49` |
| `ShopReviews` | `components/shops/shop-reviews.tsx` | Minor restyle; add "See all" link |

### New components

| Component | File | Description |
|---|---|---|
| `ShopActionsRow` | `components/shops/shop-actions-row.tsx` | Check In (primary button) + Save (icon) + Share (icon). On mobile triggers `CheckInSheet`; on desktop triggers `CheckInPopover`. Absorbs `BookmarkButton` and `StickyCheckinBar` responsibilities. |
| `CheckInSheet` | `components/shops/check-in-sheet.tsx` | Vaul drawer (mobile) / Dialog (desktop). Simplified form: photo upload (required), star rating (optional), review text (optional), mood prompt (optional). No taxonomy tag confirmation — that remains on the full `/checkin/[shopId]` page. On successful submit, shows stamp toast. |
| `ClaimBanner` | `components/shops/claim-banner.tsx` | Footer strip: "Is this your café? Claim this page →" |
| `SavePopover` | `components/shops/save-popover.tsx` | Desktop-only 320px popover anchored to Save button. Same list logic as `SaveToListSheet`. |
| `SharePopover` | `components/shops/share-popover.tsx` | Desktop-only 320px popover anchored to Share button. URL copy field + platform icon row (Threads, LINE, WhatsApp, Mail, More). Replaces `ShareButton` on desktop. |
| `CheckInPopover` | `components/shops/check-in-popover.tsx` | Desktop-only 320px popover anchored to Check In button. Wraps `CheckInSheet` form content. |

### Deleted

| Component | Reason |
|---|---|
| `StickyCheckinBar` | Replaced by `ShopActionsRow` |
| `BookmarkButton` | Absorbed into `ShopActionsRow` and hero overlay |

### ShopDetailClient wiring

`ShopDetailClient` gains local state:
```typescript
const [checkInOpen, setCheckInOpen] = useState(false)
const [saveOpen, setSaveOpen] = useState(false)
const [shareOpen, setShareOpen] = useState(false)
```

`useIsDesktop()` hook controls which variant renders — sheets on mobile, popovers on desktop.

---

## Data Flow

No new API routes. All new components reuse existing integrations:

- `CheckInSheet` → `POST /api/checkins` (existing proxy)
- `SavePopover` / `SaveToListSheet` → `useUserLists()` hook (existing)
- `SharePopover` → `navigator.share()` / `navigator.clipboard.writeText()` (existing)

---

## Error Handling

- `CheckInSheet`: inline error banner on failed submit; photo-required validation before submit
- `SavePopover` / `SaveToListSheet`: cap-reached state driven by `useUserLists` derived state (`lists.length === 3`)
- Desktop popovers: dismiss on outside click or Escape key (Radix Popover behaviour)

---

## Testing Strategy

**New unit tests:**
- `CheckInSheet`: photo-required validation blocks submit; successful submit calls `/api/checkins`; error state renders inline error
- `ShopActionsRow`: renders correct variant on mobile vs desktop; Check In opens correct sheet/popover
- `SavePopover`: opens on click; list rows render; save action calls `saveShop()`
- `SharePopover`: URL field displays correct slug URL; copy button calls clipboard API
- `CheckInPopover`: renders photo upload zone; submit button disabled without photo

**Updated tests:**
- `ShopDetailClient`: replace `StickyCheckinBar` assertions with `ShopActionsRow`; add assertions for new sections (ClaimBanner)
- `SaveToListSheet`: update to cover all 3 visual states (has lists / no lists / cap reached)

**No change needed:**
- `DirectionsSheet` tests (logic unchanged)
- `ShopHero`, `ShopIdentity` etc. (render tests need minor selector updates only)
