# Phase 2A Completion Design

Date: 2026-03-05

## Overview

Complete the remaining Phase 2A items: StampData type fix, UGC analytics instrumentation (3 PostHog events), and user journey tests for lists and profile pages.

## Work Items

### 1. StampData Type Fix

Add `shopName: string | null` to the `Stamp` interface in `lib/types/index.ts`. The hook's `StampData` interface and `makeStamp()` factory already include `shop_name` — this aligns the canonical domain type.

**Files:** `lib/types/index.ts`

### 2. Analytics Utility — `useAnalytics` Hook

Create `lib/posthog/use-analytics.ts`:

- Lazily imports `posthog-js` (matches existing pattern in `provider.tsx`)
- Exposes `capture(event: string, properties: Record<string, unknown>)` function
- No-ops when `NEXT_PUBLIC_POSTHOG_KEY` is not set
- Returns a stable function reference via `useCallback` (no re-renders)
- Tests mock the hook at module boundary

**Files:** `lib/posthog/use-analytics.ts`, `lib/posthog/__tests__/use-analytics.test.ts`

### 3. `checkin_completed` Event

**Frontend:** In `app/(protected)/checkin/[shopId]/page.tsx`, after successful `POST /api/checkins`, call:

```ts
capture('checkin_completed', {
  shop_id: shopId,
  is_first_checkin_at_shop: response.is_first_checkin_at_shop,
  has_text_note: note.trim().length > 0,
  has_menu_photo: menuPhoto !== null,
});
```

**Backend:** Enhance `CheckInService.create()` to check prior check-ins:

```python
# Before insert
count = db.table("check_ins").select("id", count="exact")
    .eq("user_id", user_id).eq("shop_id", shop_id).execute()
is_first = count.count == 0

# After insert, include in response
```

Add `is_first_checkin_at_shop: bool` to the check-in API response. Frontend proxy passes it through.

**Files:**
- `backend/services/checkin_service.py` — add count check
- `backend/api/checkins.py` — include field in response
- `backend/models/types.py` — add response model field
- `app/api/checkins/route.ts` — pass through
- `app/(protected)/checkin/[shopId]/page.tsx` — fire event

### 4. `profile_stamps_viewed` Event

**Frontend:** In `app/(protected)/profile/page.tsx`, fire once when stamps finish loading:

```ts
useEffect(() => {
  if (!stampsLoading && stamps.length > 0) {
    capture('profile_stamps_viewed', { stamp_count: stamps.length });
  }
}, [stampsLoading, stamps.length]);
```

**Files:** `app/(protected)/profile/page.tsx`

### 5. `session_start` Event

**DB migration:** Add to `profiles` table:
- `session_count` integer DEFAULT 0
- `first_session_at` timestamptz NULL
- `last_session_at` timestamptz NULL

**Backend:** New `POST /auth/session-heartbeat` endpoint:
- If `last_session_at` is NULL or >30 min ago: increment `session_count`, set `first_session_at` on first call, update `last_session_at`
- Returns `{ days_since_first_session: int, previous_sessions: int }`
- If within 30 min: returns current values without incrementing (dedup)

**Frontend:** Create `SessionTracker` component, mounted once in root layout:
- On mount, calls `POST /api/auth/session-heartbeat`
- On response, fires `session_start` event with returned values
- Only fires once per mount (no re-fires on re-render)

**Files:**
- `supabase/migrations/XXXX_session_tracking.sql`
- `backend/api/auth.py` — new endpoint
- `backend/services/profile_service.py` — heartbeat logic
- `app/api/auth/session-heartbeat/route.ts` — proxy
- `components/session-tracker.tsx` — client component
- `app/layout.tsx` — mount SessionTracker

### 6. Lists Page User Journey Tests

Add to `app/(protected)/lists/page.test.tsx`:

| Test | Description |
|------|-------------|
| Create list flow | User types name, clicks create, new list appears in rendered list |
| 3-list cap enforcement | At 3 lists, create attempt shows error toast/message |
| Delete list flow | User clicks delete on a list, confirms, list disappears |
| Add shop to list | Via SaveToListSheet component, shop count increments |

Pattern: Mock `fetch` to simulate API responses. Use `userEvent` for interactions. Verify DOM updates via `waitFor` + `screen.getByText`.

**Files:** `app/(protected)/lists/page.test.tsx`

### 7. Profile Page User Journey Tests

Add to `app/(protected)/profile/page.test.tsx`:

| Test | Description |
|------|-------------|
| Stamp tap opens detail sheet | Click stamp, StampDetailSheet appears with shop name + earned date |
| Check-in history shows shop info | Shop name, date, photo indicators visible in history tab |
| Empty stamps state | No stamps returns empty passport message |
| Empty check-ins state | No check-ins shows empty history message |

**Files:** `app/(protected)/profile/page.test.tsx`

## Architecture

```
Frontend
  lib/posthog/use-analytics.ts       (new hook)
  components/session-tracker.tsx      (new component)
  app/layout.tsx                      (mount SessionTracker)
  app/(protected)/checkin/[shopId]/   (fire checkin_completed)
  app/(protected)/profile/            (fire profile_stamps_viewed)

Backend
  POST /auth/session-heartbeat        (new endpoint)
  POST /checkins                      (enhanced response)
  profiles table                      (+3 columns)
```

## Testing Strategy

- `useAnalytics` hook: unit test (mock posthog-js import)
- `checkin_completed`: integration test in check-in page test (verify capture called after submit)
- `profile_stamps_viewed`: integration test in profile page test (verify capture called on load)
- `session_start`: unit test for SessionTracker + backend test for heartbeat endpoint
- Lists/Profile journey tests: integration tests with mocked fetch
