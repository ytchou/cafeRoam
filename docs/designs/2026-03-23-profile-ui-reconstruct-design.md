# Design: Profile UI Reconstruct

Date: 2026-03-23
Status: Approved
Pencil Frame: `AnVsF` (Profile View Desktop)

---

## Overview

Rebuild the Profile page UI to match the approved Pencil design. The page keeps its existing component boundaries (header, memories section, check-in history) but each component gets a visual overhaul to match the warm, card-based design language established in the UI Reconstruct series.

## Decisions Summary

| Decision           | Choice                                   | Rationale                                |
| ------------------ | ---------------------------------------- | ---------------------------------------- |
| Email source       | Supabase auth session (client-side)      | Already available, no backend change     |
| Second stat        | Polaroid/Memory count (from stamp_count) | Stamps → Memories rebrand                |
| Check-in location  | Skip entirely                            | Simplify card, no backend change         |
| Sort toggle        | Skip entirely                            | API returns newest-first already         |
| Check-in thumbnail | Shop main photo (backend change)         | Best UX, shows recognizable shop imagery |
| Mobile memories    | Horizontal scroll                        | Natural mobile pattern, swipeable        |

---

## Components

### 1. ProfileHeader (`components/profile/profile-header.tsx`)

Full redesign: brown banner with stats.

**Props changes:**

- Add `email: string | null` (from Supabase auth session)
- Add `stampCount: number` (relabeled as "Memories")
- Keep `displayName`, `avatarUrl`, `checkinCount`

**Visual spec (from Pencil):**

- Full-width `bg-[#8B5E3C]` (Map Brown) banner
- Inner: max-w-4xl centered, `py-8 px-8`
- Left side:
  - Avatar: 80px circle, `bg-[#F5EDE4]`, 2px `border-white/40`, initials in Bricolage 28px bold `text-[#8B5E3C]`
  - Name: white, Bricolage Grotesque 26px bold
  - Email: `text-white/50`, 13px
  - "Edit Profile →": white, 13px, links to `/settings`
  - Gap between avatar and text: 20px
- Right side (stats row):
  - Numbers: white, Bricolage 32px bold
  - Labels: `text-white/50`, 12px medium
  - Vertical divider: `bg-white/30`, 48px tall, 1px wide
  - Each stat has horizontal padding 32px
- Layout: `justify-between`, `items-center`

**Mobile adaptation:**

- Stack avatar + info vertically centered
- Stats row below, centered
- Reduce avatar to 64px, name to 22px, numbers to 28px

### 2. PolaroidSection (`components/stamps/polaroid-section.tsx`)

Change from 2-col grid to horizontal scroll with new card style.

**Visual spec:**

- Section header: "My Memories" (Bricolage 20px bold) + "3 recent visits" subtitle (13px `text-[#9CA3AF]`)
- "View All" badge: brown pill (`bg-[#F5EDE4]`, `text-[#8B5E3C]`, rounded-full, with images icon)
- Card row: horizontal scroll (`overflow-x-auto`), `gap-4`, scroll snap
- Each card:
  - White bg, `rounded-lg`, shadow (`0 3px 12px rgba(0,0,0,0.08)`), `p-2.5`
  - Photo: 130px height, `rounded-sm`, `object-cover`, full width
  - Shop name: 12px bold, `text-[#1A1918]`
  - Diary note: 11px italic, `text-[#9CA3AF]` (from stamp's `diary_note`)
  - Card width: ~200px on mobile, flexible on desktop
- Desktop: 3 cards fill available width equally
- Mobile: cards have min-width, scroll horizontally
- Max preview: keep at 3 (was 4)
- No pins, no rotation (remove PolaroidCard dependency for this section)
- Empty state: preserve existing dashed-border empty state

### 3. CheckinHistoryTab (`components/profile/checkin-history-tab.tsx`)

New card design with shop photo.

**Type changes:**

- Frontend `CheckInData`: add `shop_photo_url: string | null`

**Visual spec:**

- Section header: "Check-in History" (Bricolage 20px bold) — no sort toggle
- Each card:
  - White bg, `rounded-2xl`, border `border-[#F3F4F6]`, `p-4`, `gap-3.5`
  - Shadow: `0 1px 4px rgba(0,0,0,0.04)`
  - Left: 72×72px thumbnail, `rounded-xl`
    - If `shop_photo_url`: show shop photo via `next/image`
    - Fallback: coffee icon in `bg-[#F5EDE4]` circle, icon `text-[#8B5E3C]`
  - Right:
    - Row 1: shop name (DM Sans 15px bold) + relative date (12px `text-[#9CA3AF]`), `justify-between`
    - Row 2: `review_text` as note (13px `text-[#9CA3AF]`, `leading-[1.4]`)
  - Remove: star ratings, MRT location
- Gap between cards: 12px

### 4. Profile Page (`app/(protected)/profile/page.tsx`)

- Warm background: `bg-[#F5F4F1]` on content area (below header)
- Pass `email` from Supabase `useUser()` to ProfileHeader
- Pass `stamp_count` to ProfileHeader for Memories stat
- Section structure:
  1. ProfileHeader (full-width, breaks out of max-width)
  2. Content area (max-w-4xl centered):
     - My Memories section header + PolaroidSection
     - Check-in History section header + CheckinHistoryTab
- Desktop: content at max-w-4xl (960px), centered
- Mobile: full-width with px-4 padding

---

## Backend Changes

### CheckInWithShop model (`backend/models/types.py`)

```python
class CheckInWithShop(CamelModel):
    # ... existing fields ...
    shop_photo_url: str | None = None  # NEW: first photo from shops.photo_urls
```

### CheckInService.get_by_user (`backend/services/checkin_service.py`)

Extend the shops JOIN to include `photo_urls`, extract first photo:

```python
row["shop_photo_url"] = first_or_none(shop_data.get("photo_urls"))
```

### Frontend type (`lib/hooks/use-user-checkins.ts`)

```typescript
export interface CheckInData {
  // ... existing fields ...
  shop_photo_url: string | null; // NEW
}
```

---

## Testing Strategy

| Component         | Test Focus                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ProfileHeader     | Banner renders, stats display correctly, email shows when provided, email hides when null, Edit Profile links to /settings                     |
| PolaroidSection   | Horizontal scroll container renders, correct card count (max 3), "View All" link present, empty state works                                    |
| CheckinHistoryTab | Shop photo renders in thumbnail, coffee icon fallback when no photo, review_text displayed, no star ratings rendered, relative date formatting |
| Backend           | `shop_photo_url` populated from shops JOIN, null when shop has no photos                                                                       |

---

## Out of Scope

- Public profiles (V1 is private only per SPEC)
- Sort functionality on check-in history
- District/location display on check-in cards
- List count stat (using memory/stamp count instead)
