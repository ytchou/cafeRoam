# DEV-326 — Loading States and Visual Feedback Design

**Date:** 2026-04-13
**Linear:** [DEV-326](https://linear.app/ytchou/issue/DEV-326/fixux-add-loading-states-and-visual-feedback-for-button-clicks-and)
**Status:** Approved — ready for implementation

## Problem

The app feels unresponsive. Clicking shop cards, submitting search, toggling lists in save-popover, and navigating between tabs all show no visual feedback for 1–3 seconds. Users can't tell if an action is processing or broken. This was flagged as a high-priority UX bug during the pre-launch audit and sits directly on the critical path for the Threads-link launch — if users click through a shared shop link and nothing visibly happens, they bounce.

## Goals

- Every async action and every route transition shows visible feedback within 100ms.
- The pattern is standardized so future features inherit it automatically instead of each reinventing its own text-swap state shape.
- Zero regression to existing E2E coverage (`checkin.spec.ts`, `search.spec.ts`, `following.spec.ts`, `discovery.spec.ts`).

## Non-goals

- Streaming / Suspense / `loading.tsx` route segment files — covered by a separate future concern.
- Navigation file refactors (`bottom-nav.tsx`, `header-nav.tsx`) — the global progress bar covers them, and both files have high churn from the DEV-296 nav restructure.

## Approach

Three layers working together:

### 1. Global progress bar — `next-nprogress-bar`

Install `next-nprogress-bar` and wrap the app tree inside `<PostHogProvider>`. Auto-hooks App Router `router.push()` and `<Link>` clicks, so nav tabs, header nav, and any future route-changing callsite get feedback for free without explicit per-site wiring. Config: espresso color `#2c1810`, height `3px`, spinner disabled.

**Rejected:** `nextjs-toploader` (lighter but less configurable and less flexible for App Router); bare `loading.tsx` segments (slower to appear, doesn't cover same-segment navigations).

### 2. Button primitive — extend `components/ui/button.tsx`

Add two optional props to the existing shadcn Button: `loading?: boolean` and `loadingText?: string`. When `loading=true`, the button becomes disabled, sets `aria-busy="true"`, and swaps its children for `<Spinner /> + (loadingText ?? children)`. A minimal inline SVG Spinner (16px, `currentColor`) is included — no new icon dependency.

**Critical constraint:** Button uses Radix `Slot.Root` for its `asChild` path. The loading content must be computed as the children **before** the `<Comp>` render — never wrapping `<Comp>` itself — or every `asChild` caller breaks.

All async buttons in the app (`check-in-popover`, `dashboard-edit`, `follow-button`, the filter button inside `search-bar`) migrate to this one primitive. `aria-label` stays stable on every migrated button so E2E role-name matchers (`getByRole('button', { name: /打卡|Check In/i })`) don't flake mid-submission.

**Rejected:** Per-component text swaps (keeps the inconsistency); a separate `LoadingButton` wrapper (adds a second export to remember).

### 3. Save-popover optimistic SWR pattern

Refactor `save-popover.tsx` `handleToggle` to mirror the existing `lib/hooks/use-shop-follow.ts` optimistic pattern:

```
snapshot prev lists → mutate(next, false) → await server call
  → on error: mutate(prev, false) + toast.error
```

Checkbox flips instantly. Reuses the `mutate` already exposed by `use-user-lists` (cache key `/api/lists`). `handleCreate` (new-list creation) stays awaiting — that's a distinct concern.

**Rejected:** Checkbox spinner only (still feels laggy); deferring to a separate ticket (fragments the UX win).

### 4. `useTransition` for router.push callsites

Wrap the single `router.push()` in `components/shops/shop-card.tsx` with React 19's `useTransition` so we get `isPending` for local card-level feedback (`aria-busy` + `data-pending` opacity dim) **in addition to** the global progress bar. The `<article>` element stays as the outer DOM element so `locator('article').first()` in E2E tests still resolves.

## Architectural calls (ADR-worthy)

1. **`next-nprogress-bar` vs `nextjs-toploader`** — chosen `next-nprogress-bar` for better App Router integration and config flexibility. See ADR if needed.
2. **Extend Button primitive vs per-component swaps** — chosen extension for standardization and E2E stability (one place to guard aria-label preservation).
3. **Optimistic save-popover vs spinner-only** — chosen optimistic for maximum perceived responsiveness.
4. **`useTransition` vs local `useState` for shop-card** — chosen `useTransition` for React 19 concurrent integration and free `isPending` without manual state management.

## E2E drift risk + mitigation

| Risk                                                                                  | Mitigation                                                                                                     |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `checkin.spec.ts` matches `getByRole('button', { name: /打卡\|Check In/i })`          | Task 3 sets `aria-label="Check In 打卡"` explicitly on the migrated button.                                    |
| `search.spec.ts` expects `搜尋中…` text — **which doesn't currently exist in source** | Task 8 adds the text to `search-bar.tsx`. This is a fix, not a drift.                                          |
| `discovery.spec.ts` and `search.spec.ts` use `locator('article').first()`             | Task 7 keeps `<article>` as the outer element; only adds attributes, no DOM structure change.                  |
| `following.spec.ts` checks `toBeEnabled()` waits                                      | Task 5 preserves `aria-label` on follow-button; `toBeEnabled()` still detects the loading-to-ready transition. |

## Testing classification

- **(a) New e2e journey?** No — no new critical user path introduced. Fix improves feedback on existing covered journeys.
- **(b) Coverage gate impact?** No — no critical-path service touched. Frontend UX only.
- **(c) E2E drift risk?** Yes — mitigations listed above. Task 9 in the implementation plan runs all affected specs explicitly.

## Files touched

See [docs/plans/2026-04-13-dev326-loading-states-plan.md](../plans/2026-04-13-dev326-loading-states-plan.md) for the task-by-task breakdown. Summary:

| Layer      | Files                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Deps       | `package.json`                                                                                                                          |
| Layout     | `app/layout.tsx`                                                                                                                        |
| Primitive  | `components/ui/button.tsx` + test                                                                                                       |
| Components | `shop-card.tsx`, `search-bar.tsx`, `save-popover.tsx`, `check-in-popover.tsx`, `dashboard-edit.tsx`, `follow-button.tsx` (+ tests each) |
| Excluded   | `bottom-nav.tsx`, `header-nav.tsx`, `loading.tsx` segments                                                                              |

## Out of scope

- `loading.tsx` route segment files (streaming/Suspense — separate concern)
- Navigation component refactors (global progress bar handles them)
- Server-side streaming / Suspense boundaries
