# DEV-257: Clarify Near Me Behavior — Design Doc

**Date:** 2026-04-05
**Ticket:** [DEV-257](https://linear.app/ytchou/issue/DEV-257)
**Scope:** Explore page only (VibePage is out of scope — follow-up ticket)

## Problem

The Explore page's "Near Me" button silently disables when GPS is denied, auto-selects the first district with zero user feedback, and provides no explanation of what "Near Me" means (3 km radius). Users are left confused about what they're seeing and why.

## Design Decisions

### 1. GPS Denied Feedback

**Chosen:** Inline message below DistrictPicker — "Location unavailable — pick a district to explore"

- Non-dismissible, disappears when user selects a district
- Persistent and contextual — user sees it right where the action is

**Rejected:**

- Toast notification: dismissed too quickly, user may miss it
- Both (inline + toast): maximum clarity but noisy for a non-critical state

### 2. Near Me Radius Label

**Chosen:** Subtitle under the picker when Near Me is active — "Within X km of you"

- Updates dynamically: 3 km default → 10 km after expansion
- Simple, contextual, no interaction required

**Rejected:**

- No radius label: "Near Me" is not self-explanatory enough — users don't know the search area
- Tooltip on hover/tap: lower discoverability than always-visible subtitle

### 3. GPS Loading State

**Chosen:** Pulsing Near Me pill (`animate-pulse`) + subtitle "Finding your location…"

- Distinguishes GPS acquisition from API loading (skeleton loaders)
- Transitions cleanly to active or denied state

**Rejected:**

- No special loading state: GPS acquisition indistinguishable from API loading
- Spinner icon on pill: less visible than the shimmer effect

## Architecture

### GPS Status States

| State               | Pill Style      | Subtitle                                            | Condition                           |
| ------------------- | --------------- | --------------------------------------------------- | ----------------------------------- |
| `loading`           | Pulsing gray    | "Finding your location…"                            | `geoLoading === true`               |
| `active`            | Amber (active)  | "Within X km of you"                                | GPS available, no district selected |
| `denied`            | Gray (disabled) | "Location unavailable — pick a district to explore" | `geoError` or no coordinates        |
| `district-selected` | Inactive        | None                                                | User selected a district            |

### Component Changes

- **DistrictPicker** gains `gpsStatus` (discriminated union) and `radiusKm` (number) props
- **ExplorePage** derives `gpsStatus` from existing `useGeolocation` state and passes it down
- **useTarotDraw** exposes `radiusKm` (already tracked internally, just not returned)
- Status line uses `role="status"` + `aria-live="polite"` for screen reader accessibility

### Files Touched

| File                                          | Change                               |
| --------------------------------------------- | ------------------------------------ |
| `lib/hooks/use-tarot-draw.ts`                 | Add `radiusKm` to return             |
| `components/explore/district-picker.tsx`      | New props, status line, loading pill |
| `app/explore/page.tsx`                        | Derive `gpsStatus`, pass 2 new props |
| `components/explore/district-picker.test.tsx` | Update renders + 6 new tests         |
| `app/explore/page.test.tsx`                   | 3 new tests                          |
| `SPEC.md`                                     | Update §9 geolocation fallback rule  |

## Testing Classification

- [ ] No — no new e2e journey (Explore page already exists)
- [ ] No — no critical-path service touched (frontend-only, presentational)

## Edge Cases

- **GPS loading → denied:** Pill transitions from pulsing to disabled; subtitle updates via `aria-live`
- **Radius expansion:** "Within 3 km" → "Within 10 km" updates automatically via `radiusKm` prop
- **No districts loaded:** DistrictPicker doesn't render at all (existing guard in page.tsx)
