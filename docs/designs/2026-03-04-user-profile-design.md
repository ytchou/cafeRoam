# User Profile Page — Design

Date: 2026-03-04

## Overview

Build out the `/profile` page into the full private profile experience described in the SPEC: stamp passport (hero), check-in history tab, and lists tab — plus profile header with display name and avatar. Profile editing (display name, avatar) is delegated to `/settings`.

---

## Layout

```
┌─────────────────────────────────┐
│ [Avatar]  Display Name          │
│           12 stamps · 8 check-ins│
│                    [Edit Profile→]│
├─────────────────────────────────┤
│  ── My Passport ──   12 stamps  │
│  [stamp grid — always visible]  │
│  (tap stamp → bottom sheet)     │
├─────────────────────────────────┤
│  [Check-ins]        [Lists]     │
├─────────────────────────────────┤
│   (active tab content)          │
└─────────────────────────────────┘
```

The stamp passport is always visible (hero section). Check-ins and Lists are in tabs below.

---

## Components

### Profile Header

**File:** `components/profile/profile-header.tsx`

- Avatar: circular, 64px. Falls back to initials (first char of display name or email prefix) in a muted background if no `avatar_url`.
- Display name: if `display_name` is null, show email prefix as fallback.
- Stats row: `{stamp_count} stamps · {checkin_count} check-ins`
- "Edit Profile →" text link → `/settings`
- Data: `useUserProfile()` hook

### Stamp Passport (existing, enhanced)

**File:** `components/stamps/stamp-passport.tsx` (enhance)

- Keep existing 4×5 grid layout.
- Enhancement: tapping a filled stamp opens `StampDetailSheet`.

**New:** `components/stamps/stamp-detail-sheet.tsx`

- Bottom sheet (shadcn Sheet or custom slide-up).
- Shows: stamp SVG (large), shop name, earned date (formatted), "Visit Again →" link to `/shop/[shopId]`.
- Requires `shop_name` on the stamp data — backend must JOIN shops on `GET /stamps`.

### Check-ins Tab

**File:** `components/profile/checkin-history-tab.tsx`

Each card:
```
┌──────────────────────────────────┐
│ [photo]  Fika Coffee             │
│  60x60   ★★★★☆  3 weeks ago     │
│          Daan District           │
└──────────────────────────────────┘
```

- Photo: first URL from `photo_urls`, 60×60 rounded.
- Shop name links to `/shop/[shop_id]`.
- Stars: rendered only if `stars` is set.
- Date: relative format (`formatDistanceToNow` from date-fns).
- Empty state: "No check-ins yet — find a shop to visit".
- Data: `useUserCheckins()` hook

### Lists Tab

**File:** `components/profile/lists-tab.tsx`

Each card:
```
┌────────────────────────────────┐
│ My Favourites           8 shops │
│ [img][img][img]+5              │
└────────────────────────────────┘
```

- Thumbnail strip: first 3 shop cover photos (40×40 each, overlapping).
- `+N` badge if more than 3 shops.
- Tapping → `/lists/[id]`
- Empty state: "No lists yet — save shops to organise your favourites" + "Create a list →" button → `/lists`
- Data: existing `useUserLists()` hook (backend enhancement needed — see below)

---

## Data Hooks

| Hook | Endpoint | Status |
|---|---|---|
| `useUserProfile()` | `GET /profile` | New |
| `useUserStamps()` | `GET /stamps` | Exists — extend response shape |
| `useUserCheckins()` | `GET /checkins` | New hook, endpoint exists — extend response shape |
| `useUserLists()` | `GET /lists` | Exists — extend response shape |

All hooks use `fetchWithAuth` + SWR.

---

## Backend Changes

### New: `GET /profile`

Returns profile data + aggregate stats for the header.

**Response:**
```json
{
  "display_name": "Mei-Ling",
  "avatar_url": "https://...",
  "stamp_count": 12,
  "checkin_count": 8
}
```

Implementation: JOIN profiles + COUNT(stamps) + COUNT(check_ins) for the authenticated user. Single query with subquery counts.

### New: `PATCH /profile`

Updates `display_name` and/or `avatar_url`.

**Request body:**
```json
{
  "display_name": "Mei-Ling",  // optional, max 30 chars
  "avatar_url": "https://..."  // optional, must be a Supabase Storage URL
}
```

Validation:
- `display_name`: strip whitespace, max 30 chars, min 1 char if provided
- `avatar_url`: must start with the project's Supabase Storage URL (prevent arbitrary URLs)

### Extended: `GET /stamps`

Add `shop_name` field to each stamp (JOIN with `shops` table).

**Current response item:**
```json
{ "id": "...", "shop_id": "...", "design_url": "...", "earned_at": "..." }
```

**New response item:**
```json
{ "id": "...", "shop_id": "...", "shop_name": "Fika Coffee", "design_url": "...", "earned_at": "..." }
```

### Extended: `GET /checkins`

Add `shop_name`, `shop_neighborhood`, `shop_cover_photo` (JOIN with `shops`).

**New response item:**
```json
{
  "id": "...",
  "shop_id": "...",
  "shop_name": "Fika Coffee",
  "shop_neighborhood": "Daan District",
  "shop_cover_photo": "https://...",
  "photo_urls": ["..."],
  "stars": 4,
  "review_text": null,
  "created_at": "..."
}
```

### Extended: `GET /lists`

Add `shop_count` and `preview_photos` (first 3 shop cover photos) per list.

**New response item:**
```json
{
  "id": "...",
  "name": "My Favourites",
  "shop_count": 8,
  "preview_photos": ["url1", "url2", "url3"]
}
```

### New files:
- `backend/api/profile.py` — router for GET/PATCH /profile
- `backend/services/profile_service.py` — service logic

---

## Settings Page Additions (`/settings`)

New section added **above** Logout:

```
── Profile ──────────────────────

Display name
[__________________________]  (max 30 chars)

Avatar
[circular preview]  [Upload photo]

[Save changes]
```

- Avatar upload: file picker (image/* only, max 1MB). On select: upload to Supabase Storage `avatars/{user_id}` via client-side `supabase.storage.from('avatars').upload(...)`, then set URL. On save: `PATCH /api/profile` with new `avatar_url`.
- Display name: controlled text input. Save triggers `PATCH /api/profile`.
- New proxy route: `app/api/profile/route.ts` → GET + PATCH → Python backend

---

## Error Handling

- Profile fetch fails: show skeleton → error toast "Couldn't load profile"
- PATCH profile fails: show inline error below the form field
- Check-ins/stamps/lists fetch fails: show section-level error state with retry button
- Avatar upload fails (size/type): client-side validation before upload attempt

---

## Analytics

- Fire `profile_stamps_viewed` (existing PostHog event) with `stamp_count` when passport section is visible
- No new events needed for check-in history or lists tab views in V1

---

## Testing Strategy

**Frontend (Vitest + Testing Library):**
- `profile/page.test.tsx` — extend: header renders with display name + stats, tabs switch, each tab's empty state
- `settings/page.test.tsx` — extend: display name input, avatar upload, save success, save error
- `components/stamps/stamp-detail-sheet.test.tsx` — new: renders shop name, date, link
- `components/profile/checkin-history-tab.test.tsx` — new: renders cards, empty state
- `components/profile/lists-tab.test.tsx` — new: renders cards, empty state

**Backend (pytest):**
- `backend/tests/test_profile_api.py` — new: GET /profile (auth required, returns correct counts), PATCH /profile (validation, 401, success)
- `backend/tests/test_stamps_api.py` — extend: GET /stamps now includes shop_name
- `backend/tests/test_checkins_api.py` — extend: GET /checkins includes shop data

---

## Out of Scope (V1)

- Public profiles (SPEC: profile is private in V1)
- Shareable stamp collections or check-in feeds
- Social features (following, liking)
- "Exclude already visited" filter on directory
- Stamp trading or purchasing
