# Profile Redesign — Polaroid Memory Board

**Date:** 2026-03-19
**Status:** Approved — pending implementation
**Extends:** [2026-03-17-profile-polaroid-passport.md](2026-03-17-profile-polaroid-passport.md)

---

## Summary

Three coordinated changes that turn the profile page from a stats dashboard into a personal memory space:

1. Profile header de-cluttered (stamp count removed)
2. Stamp passport replaced with a polaroid preview strip + "View All" link
3. New `/profile/memories` cork board page — scattered or grid layout, user-toggled

---

## Profile Page Changes

### Header (`profile-header.tsx`)

Remove `stampCount` prop and the "12 stamps ·" text. Keep check-in count only.

Before: `12 stamps · 8 check-ins`
After: `8 check-ins`

"Edit Profile →" link stays.

### Polaroid Preview Section (replaces `StampPassport`)

New `PolaroidSection` component renders the 4 most recent stamps as a 2-column polaroid grid.

Section header: **"My Memories"** (no stamp count inline)

Each card:
- Check-in photo (full-bleed, square crop)
- White bottom strip (~20% card height)
- Shop name (small, semi-bold)
- District + month (smaller, muted)
- No rotation in the preview — keeps the profile page fast and clean

"View All →" routes to `/profile/memories`.

If the user has 0 stamps: show an empty state ("Your memories will appear here after your first check-in").

### Tabs Section

Remove the Lists tab. `useListSummaries` hook import removed from `page.tsx`. Render `CheckinHistoryTab` directly without the `<Tabs>` wrapper.

---

## `/profile/memories` — Cork Board Page

### Layout Toggle

Top-right corner: two icon buttons (grid icon, scatter icon).
- Active state: filled icon, darker background pill
- Preference persisted in `localStorage` under key `caferoam:memories_view`
- Default: **scattered**

### Cork Board Background

Warm cork texture rendered entirely in CSS — no image asset:
- Background color: `#C8A97B`
- Overlaid radial gradient dots at varying opacities to simulate cork grain
- Applied to the page container, not individual cards

### Polaroid Card Anatomy

```
     ●          ← push pin (SVG, centered on top edge)
┌──────────────┐
│              │
│  check-in    │
│    photo     │  ← full-bleed, square
│              │
├──────────────┤
│ Fika Coffee  │  ← shop name, 13px semi-bold
│ 大安 · Feb   │  ← district + month, 11px muted
└──────────────┘
```

White card with `box-shadow: 0 4px 12px rgba(0,0,0,0.25)` to simulate lift from board.

Push pin: small SVG circle head + short stem. Cycles through 4 colors by `index % 4`: red `#E05252`, blue `#5271E0`, yellow `#E0C452`, green `#52B052`.

### Scattered View

- Tall scrollable canvas (`min-height: 200vh`)
- Positions computed deterministically from a hash of `stamp.id` — same layout every visit, no hydration mismatch
- X: `hash % (containerWidth - cardWidth)`, Y: row-banded with jitter
- Rotation: `(hash % 25) - 12` degrees (range: −12° to +12°)
- Cards may partially overlap (intentional — feels physical)
- Touch/click still works; hit area is the full card bounding box

### Grid View

- 2-column CSS grid, `gap: 1rem`, `padding: 1rem`
- Each card rotates by a value from `[3, -2, 5, -4, 1, -3, 2]` degrees, cycled by index
- Cards do not overlap
- Consistent scan order (newest first)

### Tap / Click

Both views: tapping a polaroid opens the updated `StampDetailSheet` (see below).

---

## Updated `StampDetailSheet`

Replaces the current minimal drawer with a richer memory view:

- Large polaroid card with ±3° random tilt (feels like holding a physical photo)
- Shop name + date earned
- Diary note (if present) — italic quote block, soft background
- Review text (if present) — shown below diary
- "Visit Again →" CTA linking to `/shop/[id]`
- "Share" button (deferred — share card canvas generation is a follow-up task)

---

## Data Changes

### Frontend — `StampData` type (new optional fields)

```ts
photo_url: string | null      // check_ins.photo_urls[0]
district: string | null        // shops.district
diary_note: string | null      // check_ins.diary_note (if column exists)
```

### Backend — `/api/stamps` endpoint

Add JOIN with `check_ins` (on `stamps.check_in_id`) and `shops` (on `stamps.shop_id`).

Return new fields: `photo_url`, `district`, `diary_note`.

`diary_note` returns `null` if the `check_ins.diary_note` column does not yet exist — the frontend must handle null gracefully.

---

## New Files

| File | Purpose |
|------|---------|
| `components/stamps/polaroid-card.tsx` | Single polaroid card (photo + white strip + pin) |
| `components/stamps/polaroid-section.tsx` | 2-col preview on profile page (4 items + "View All") |
| `components/stamps/cork-board.tsx` | Full cork board with scatter/grid toggle |
| `app/(protected)/profile/memories/page.tsx` | Route for the memory board |

## Modified Files

| File | Change |
|------|--------|
| `components/profile/profile-header.tsx` | Remove `stampCount` prop + stat display |
| `app/(protected)/profile/page.tsx` | Swap `StampPassport` → `PolaroidSection`; remove Lists tab + hook |
| `components/stamps/stamp-detail-sheet.tsx` | Add diary note, tilted polaroid layout, updated props |
| `lib/hooks/use-user-stamps.ts` | Add `photo_url`, `district`, `diary_note` to `StampData` |
| `backend/api/stamps.py` | JOIN with `check_ins` + `shops`; return new fields |

---

## Out of Scope (Follow-ups)

- Share card canvas generation (specced in `2026-03-17-profile-polaroid-passport.md §2`)
- Diary field on check-in form (separate feature, separate PR)
- `check_ins.diary_note` DB column (add when diary check-in feature ships)
