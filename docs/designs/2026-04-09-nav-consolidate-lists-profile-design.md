# Navigation Consolidation: Lists → Profile Design

**Date:** 2026-04-09
**Ticket:** DEV-296
**Status:** Approved

## Problem

The standalone `/lists` page occupies a dedicated bottom nav tab but is too thin to justify this prominence. Users must context-switch between the "favorites" tab and the profile tab for what feels like related personal content. Reducing nav complexity simplifies the information architecture.

## Goal

Remove the Lists tab from bottom navigation and header nav. Integrate lists as a read-only tab preview inside the profile page. The full `/lists` route remains accessible for the map view and CRUD operations.

## Architecture

**Navigation:** 4 tabs (Home, Map, Explore, Profile). No routing changes — `/lists` stays as a real page, just not in the nav.

**Profile page layout:**

```
ProfileHeader (always visible)
FollowingSection (always visible)
─────────────────────────────────
  Stamps │ Lists │ Check-ins       ← Radix UI Tabs (line variant)
─────────────────────────────────
  (active tab content)
```

**URL state:** `?tab=stamps|lists|checkins`. Default: `stamps`. URL updates on tab switch via `router.replace`.

## Component Structure

```
components/profile/
  profile-tabs.tsx     NEW — Tabs wrapper + tab routing
  stamps-tab.tsx       NEW — Extract PolaroidSection + StampDetailSheet from page
  lists-tab.tsx        NEW — Read-only list preview + "View all lists →" CTA
  checkin-history-tab.tsx  EXISTING — unchanged
  following-section.tsx    EXISTING — unchanged
  profile-header.tsx       EXISTING — unchanged
```

## Lists Tab Design

Read-only. No create/rename/delete actions. Each list is a simple card linking to `/lists/[listId]`.

```
[List name]          [N shops]
[List name]          [N shops]
[Empty slot card]
────────────────────
View all lists →  (links to /lists)
```

Empty state: "No lists yet — Create your first list →" (links to /lists)

Reused: `EmptySlotCard` (onClick → navigate to `/lists`)
NOT reused: `FavoritesListCard` (has CRUD UI, not appropriate for read-only context)

## Data Flow

- `useUserLists()` — lists, isLoading (already exists, no API changes)
- `useUserStamps()`, `useUserCheckins()` — hoisted to profile page, passed as props to ProfileTabs
- All backend endpoints unchanged

## Routing

| Route                | Before              | After                         |
| -------------------- | ------------------- | ----------------------------- |
| `/lists`             | Standalone tab page | Still exists, not in nav      |
| `/lists/[listId]`    | Detail page         | Unchanged                     |
| `/profile`           | Stacked sections    | Tabbed (default: stamps)      |
| `/profile?tab=lists` | N/A                 | Profile with lists tab active |

## Error Handling

No new error states. Each tab defers to its inner component's loading/error handling (existing behavior).

## Testing Strategy

**Unit (vitest):**

- `bottom-nav.test.tsx` — 4 tabs, no Lists/收藏 tab
- `profile-tabs.test.tsx` — 3 tab triggers, tab switching, URL update
- `stamps-tab.test.tsx` — stamps render, selectedStamp state
- `lists-tab.test.tsx` — list cards, "View all lists →" link, empty state
- `profile/page.test.tsx` — reads `?tab` param, passes defaultTab to ProfileTabs

**E2E (playwright):**

- `profile.spec.ts` — smoke: 3 tabs visible, Lists tab shows "View all lists →" CTA
- `lists.spec.ts` — no route changes needed (J12–J27 navigate to `/lists` directly, which still exists)

## Testing Classification

- [ ] New e2e journey? No — list management at `/lists` is unchanged.
- [ ] Coverage gate? No — no critical-path service touched.
