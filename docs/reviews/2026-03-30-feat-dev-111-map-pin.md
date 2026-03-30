# Code Review Log: feat/dev-111-map-pin

**Date:** 2026-03-30
**Branch:** feat/dev-111-map-pin
**Mode:** Pre-PR
**HEAD SHA:** b435ad656c82c0e0fe64fe4288b636bd01b1a116

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (14 total, deduplicated to 12)

| #   | Severity  | File:Line                                                     | Description                                                                                                                      | Flagged By                                 |
| --- | --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Important | `components/map/map-desktop-layout.tsx:159`                   | Type mismatch: `onPinClick` expects `(string) => void` but receives `(string \| null) => void`                                   | Bug Hunter                                 |
| 2   | Important | `components/map/map-desktop-layout.tsx:86-93`                 | `setTimeout` in `useEffect` has no cleanup — leaks timer on rapid pin clicks and unmount                                         | Bug Hunter                                 |
| 3   | Important | `components/shops/shop-preview-card.tsx:38-40`                | `capture` in analytics `useEffect` deps may cause re-fire on every render if `useAnalytics` returns new fn refs                  | Bug Hunter, Architecture                   |
| 4   | Important | `components/shops/shop-preview-card.tsx:42-48`                | Global `document` ESC listener will conflict with other open modals/sheets (e.g., FilterSheet)                                   | Architecture                               |
| 5   | Important | `components/map/map-desktop-layout.tsx:88`                    | Magic-number 200ms delay not synchronized with actual CSS transition duration                                                    | Architecture                               |
| 6   | Important | `components/shops/shop-preview-card.tsx:51`                   | Missing `transition-all duration-200` animation class on card container — design doc required, card appears/disappears instantly | Plan Alignment                             |
| 7   | Important | `components/map/map-desktop-layout.test.tsx`                  | Auto-expand test case missing — acceptance criterion #5 + design doc testing table require it                                    | Plan Alignment                             |
| 8   | Important | `components/shops/shop-preview-card.test.tsx:12-14`           | `useAnalytics` internal module mocked instead of PostHog SDK boundary — violates "mock at boundaries only"                       | Standards, Test Philosophy, Plan Alignment |
| 9   | Minor     | `components/map/map-desktop-layout.tsx`, `app/page.tsx`       | `onShopClick` prop name is semantically overloaded (select vs navigate intent)                                                   | Architecture                               |
| 10  | Minor     | `components/shops/shop-preview-card.tsx:34`                   | `photo_urls ?? photoUrls` fallback in render — should be normalized at data layer                                                | Architecture                               |
| 11  | Minor     | `components/map/map-desktop-layout.test.tsx:209`              | Test selector hard-codes exact `aria-label` string instead of role query                                                         | Architecture                               |
| 12  | Minor     | `components/shops/shop-preview-card.test.tsx:36,44,54,95,103` | `it()` descriptions use implementation language ("displays", "shows") not user outcomes                                          | Test Philosophy                            |

## Fix Pass 1

**Pre-fix SHA:** b435ad656c82c0e0fe64fe4288b636bd01b1a116

**Issues fixed:**

- [Important] `map-desktop-layout.tsx:164` — Wrapped `onPinClick` with `(id) => onShopClick(id)` to satisfy MapView's `string`-only type contract
- [Important] `map-desktop-layout.tsx:88-94` — Added `scrollTimerRef` + `clearTimeout` cleanup; extracted `PANEL_EXPAND_DELAY_MS = 200` constant
- [Important] `shop-preview-card.tsx:43-46` — Added `e.stopImmediatePropagation()` to ESC handler to prevent concurrent modal conflicts
- [Important] `shop-preview-card.tsx:51` — Added `transition-all duration-200` to card container per design spec
- [Important] `map-desktop-layout.test.tsx` — Added auto-expand integration test (acceptance criterion #5)
- [Important] `map-desktop-layout.test.tsx:209,217` — Updated Close Preview selector from `getByLabelText` to `getByRole`
- [Important] `shop-preview-card.test.tsx:12-14` — Removed `vi.mock('@/lib/posthog/use-analytics')` internal mock; real hook is no-op without env var
- [Minor] `shop-preview-card.test.tsx:36,44,54,95,103` — Renamed 5 `it()` descriptions to user-journey framing

**Batch Test Run:**

- `pnpm test` (vitest run) — PASS (1044 tests, 0 failures; +1 new test vs pre-fix 1043)

## Pass 2 — Re-Verify (Smart Routing)

_All 5 agents re-run (all had Important-severity findings in Pass 1)_

### Previously Flagged Issues — Resolution Status

- [Important] `map-desktop-layout.tsx:159` onPinClick type mismatch — ✓ Resolved
- [Important] `map-desktop-layout.tsx:86-93` setTimeout no cleanup — ✓ Resolved
- [Important] `shop-preview-card.tsx:42-48` global ESC listener conflict — ✓ Resolved
- [Important] `map-desktop-layout.tsx:88` magic-number delay — ✓ Resolved (constant extracted)
- [Important] `shop-preview-card.tsx:51` missing animation class — ✓ Resolved
- [Important] `map-desktop-layout.test.tsx` auto-expand test missing — ✓ Resolved
- [Important] `shop-preview-card.test.tsx:12-14` internal mock violation — ✓ Resolved
- [Minor] `map-desktop-layout.test.tsx:209` hard-coded aria-label selector — ✓ Resolved
- [Minor] `shop-preview-card.test.tsx` naming violations — ✓ Resolved

### New Issues Found (1)

| Severity | File:Line                    | Description                                                                                                                       | Flagged By   |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Minor    | `map-desktop-layout.tsx:164` | `(id) => onShopClick(id)` wrapper creates new fn ref each render — no-op if MapView not memoized (and it's not, via next/dynamic) | Architecture |

**Early exit:** No Critical or Important issues remain.

### Validation Results

| #   | Classification     | Reason                                                                                       |
| --- | ------------------ | -------------------------------------------------------------------------------------------- |
| 1   | Valid              | Real TS strict violation — `(string\|null) => void` not assignable to `(string) => void`     |
| 2   | Valid              | Missing `clearTimeout` — stale timer on rapid clicks or unmount                              |
| 3   | **Incorrect**      | `capture` is stable via `useCallback(fn, [])` in `use-analytics.ts:7-8` — no re-firing risk  |
| 4   | Debatable          | Real edge case; `FilterSheet` unlikely open simultaneously but fix anyway                    |
| 5   | Debatable          | 200ms intentional per design doc; panel mounts/unmounts not CSS transition; extract constant |
| 6   | Valid              | `transition-all duration-200` explicitly required in design doc, missing from implementation |
| 7   | Valid              | Auto-expand test explicitly required by design doc testing table + acceptance criterion #5   |
| 8   | Valid              | Internal hook mock violates CLAUDE.md; hook is already a no-op without env var               |
| 9   | **Debatable/Skip** | Naming was explicit design doc decision; consistent with codebase; skip                      |
| 10  | **Debatable/Skip** | Pre-existing pattern not introduced by this PR; out of scope                                 |
| 11  | Debatable          | Style preference; fix anyway                                                                 |
| 12  | Valid              | Violates CLAUDE.md non-negotiable: "frame tests from user journeys"                          |

**False positives skipped:** Issue 3 (capture is stable), Issue 9 (intentional naming), Issue 10 (pre-existing pattern)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**

- [Minor] `map-desktop-layout.tsx:164` — `(id) => onShopClick(id)` creates new fn ref each render; non-issue since MapView is not memoized (next/dynamic)

**Review log:** `docs/reviews/2026-03-30-feat-dev-111-map-pin.md`
