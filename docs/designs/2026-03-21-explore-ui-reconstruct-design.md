# Design: Explore UI Reconstruct

Date: 2026-03-21

## Overview

Restyle the three Explore-section pages and the TarotRevealDrawer component to match the approved Pencil designs. All backend logic, hooks, and API wiring are already correct — this is a pure presentation-layer pass.

**Pencil frames (approved):**

| Frame ID | Name | Platform |
|----------|------|----------|
| `UOZmR` | Explore View | Mobile |
| `RaBMi` | Explore View / Tarot Revealed | Mobile |
| `eEd4y` | Explore View / Cards Returned | Mobile |
| `IbXPH` | Explore / Vibe Results | Mobile |
| `G7Qb0` | Explore / Community | Mobile |
| `MedPD` | Explore View Desktop | Desktop |
| `E4DGS` | Explore / Tarot Revealed Desktop | Desktop |
| `NMuwP` | Explore / Vibe Results Desktop | Desktop |
| `YgUn0` | Explore / Community Desktop | Desktop |

---

## Files Changed

### 1. `app/explore/page.tsx`

**Mobile:**
- Page header: "探索" (Bricolage Grotesque, 28px, bold, `#1A1918`) + `bell` Lucide icon (22×22, `#6B7280`) — replaces current "Your Tarot Draw" section title
- Tarot section label row: "✦ Your Daily Draw" (DM Sans, 11px, 600, `#C4922A`, 1px letter-spacing) left + "Refresh ↺" (DM Sans, 11px, gray) right — separate from page header
- Vibe section: add "See all →" (`#3D8A5A`) link to `/explore/vibes`
- Cards: height 130px, dark bg `#1C0F08`, gold border `#C4922A` 1.5px, inner border rect, `cornerRadius` 14

**Desktop (`lg:`):**
- Two-column layout: left col (tarot draw section + vibe grid) + right col (community preview)
- Tarot cards: 3-up horizontal row instead of stacked vertical
- Vibe grid: 3 columns per row (same as mobile grid width but more horizontal space)
- Community preview column: right sidebar, `bg-[#F5F4F1]`

### 2. `components/tarot/tarot-reveal-drawer.tsx`

**Mobile restyling:**
- Background: `#1A1210` (dark espresso) — was `#FAF7F4`
- All body text: white or cream
- Header: "✦ Tarot Card" label in `#C4922A` (gold) + close `X` button top-right — replaces date string
- Shop photo: full-width, 4:3 ratio (unchanged)
- Tarot title: white, Bricolage, uppercase
- Shop name: white, semibold
- Neighborhood + status: gold `#C4922A`
- Flavor text: italic, `#D4B896` (warm cream)
- CTAs: "Share My Draw" (gold outline) + "Let's Go →" (filled `#C4922A` bg, dark text)
- Footer: "← Back to cards" + "Draw Again ↺" in `#9A7B5A`

**Desktop split:**
- Use `useIsDesktop()` to conditionally render shadcn `Dialog` instead of Vaul `Drawer`
- Dialog: dark scrim overlay, centered card 480px wide, `#2C1E16` bg, `#5C3D2B` border, `cornerRadius` 24
- Same content structure as mobile card
- CTAs: "Reshuffle" (outline) + "Explore This Café →" (gold filled)

### 3. `app/explore/vibes/[slug]/page.tsx`

**Mobile:**
- Back button: circle bg (`bg-gray-100`), `ArrowLeft` 18×18 — was bare text "← Back"
- Header block:
  - Emoji + vibe name (Bricolage, 22px bold, `#1A1918`)
  - Subtitle chips from `vibe.subtitle` (e.g. "Quiet · WiFi · Laptop-friendly") as small pill badges
  - Shop count: green pill badge (`#3D8A5A` bg, white text, "14 shops nearby")
- Shop list rows: white card, `rounded-xl`, `shadow-sm`
  - Cover photo: 56×56, `rounded-lg`
  - Name: 14px semibold
  - Rating: star icons + number + review count
  - District: `MapPin` icon + district name
  - Matched tags: 2 small tag chips
  - Bookmark icon: right-aligned, `#6B7280`

**Desktop (`lg:`):**
- 3-column grid using `ShopCardGrid` component
- "Want to explore other vibes?" cross-sell section at bottom: subtitle + horizontal chip row of other vibe names

### 4. `app/explore/community/page.tsx`

**Mobile:** minor polish only — sticky header styling matches design (currently close)

**Desktop (`lg:`):**
- Title: "啡遊筆記" (Bricolage, large, `#1A1918`) + subtitle "Partner reviews from our café explorers"
- 2-column grid layout for `CommunityCardFull` cards
- Remove sticky header on desktop, use `HeaderNav` (already provided by app shell)

---

## Components Reused (unchanged)

| Component | Used where |
|-----------|-----------|
| `useIsDesktop()` | TarotRevealDrawer, all pages |
| `ShopCardGrid` | Vibe Results desktop 3-col |
| `CommunityCardFull` | Community feed (no changes) |
| `CommunityCard` | Explore main community preview |
| `TarotCard`, `TarotSpread` | Explore main (no changes) |
| `useIsDesktop` | All pages for responsive split |

---

## Testing Strategy

- `app/explore/page.test.tsx`: update header text assertions ("探索" not "Your Tarot Draw"), add desktop layout test with mocked `useIsDesktop = true`
- `components/tarot/tarot-reveal-drawer.test.tsx`: add dark theme assertions, test Dialog renders on desktop
- `app/explore/vibes/[slug]/page.test.tsx`: update header structure assertions (back button, vibe name, shop count badge)
- `app/explore/community/page.test.tsx`: add 2-column desktop layout test

No new hooks, no new API routes, no backend changes required.

---

## Design Tokens Used

| Token | Value | Usage |
|-------|-------|-------|
| `#1A1210` | Dark espresso | Tarot reveal background |
| `#2C1E16` | Dark brown | Desktop modal card bg |
| `#C4922A` | Gold | Tarot accents, CTAs |
| `#1C0F08` | Near-black | Tarot card face bg |
| `#3D8A5A` | Forest green | "See all", shop count badge |
| `#F5F4F1` | Off-white | Community right col bg |
| Bricolage Grotesque | `var(--font-bricolage)` | Page titles, section headers |
| DM Sans | `var(--font-dm-sans)` | Body, labels |
