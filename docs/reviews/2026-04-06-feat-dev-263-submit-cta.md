# Code Review Log: feat/dev-263-submit-cta

**Date:** 2026-04-06
**Branch:** feat/dev-263-submit-cta
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_
_Note: Adversarial Review (Codex) unavailable — skipped gracefully._

### Issues Found (3 total)

| Severity | File:Line                                            | Description                                                                                                                                                                                                                       | Flagged By      |
| -------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Minor    | components/discovery/discovery-page.test.tsx:264     | Test uses inline `render(<Suspense>...)` instead of `renderDiscoveryPage()` helper defined at line 41 — inconsistent with the rest of the file                                                                                    | Test Philosophy |
| Minor    | components/discovery/discovery-page.test.tsx:308-309 | Redundant assertion: finds link via `querySelector('a[href="/submit"]')` then asserts `toHaveAttribute('href', '/submit')` — the selector already guarantees the href                                                             | Test Philosophy |
| Minor    | components/discovery/discovery-page.tsx:118          | Banner CTA button `px-4 py-2` results in ~36px height, below 44px touch target and DESIGN.md `h-10`/`h-12` spec. However, pre-existing "地圖瀏覽" button (line 140) uses identical sizing — established pattern, not a regression | Design Quality  |

### Validation Results

| Finding                   | File:Line                       | Classification | Notes                                                                                                                      |
| ------------------------- | ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Test helper inconsistency | discovery-page.test.tsx:264     | **Valid**      | Simple fix — replace inline render with `renderDiscoveryPage()`                                                            |
| Redundant href assertion  | discovery-page.test.tsx:308-309 | **Valid**      | Remove the redundant `toHaveAttribute` check                                                                               |
| Button height below 44px  | discovery-page.tsx:118          | **Debatable**  | Pre-existing pattern (line 140 identical). Fix would improve a11y but is not a regression. Lean conservative — fix anyway. |

## Fix Pass 1

**Pre-fix SHA:** 006a490b0c99cf6a41ba525ea127e9b421b5095f

**Issues fixed:**

- [Minor] components/discovery/discovery-page.test.tsx:264 — replaced inline `render(<Suspense>...)` with `renderDiscoveryPage()` helper, consistent with all other tests in the file
- [Minor] components/discovery/discovery-page.test.tsx:308-309 — replaced second inline render with `renderDiscoveryPage()` helper and removed the redundant `toHaveAttribute('href', '/submit')` assertion

**Issues skipped (debatable):**

- components/discovery/discovery-page.tsx:118 — touch target `px-4 py-2` on new banner CTA. Pre-existing "地圖瀏覽" button (line 140) uses identical sizing; fixing only the new button would create visual inconsistency between two sibling buttons. Deferred for a design consistency pass updating both buttons together.

**Batch Test Run:**

- `pnpm test` (modified files only) — PASS (17/17). Full suite: 1224 passed, 9 pre-existing failures in unrelated files (admin/shops timeout, checkin timeout).

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes (none found)
**Remaining issues:**

- [Minor] components/discovery/discovery-page.tsx:118 — Banner CTA touch target `px-4 py-2` (~36px) below 44px minimum. Pre-existing pattern on adjacent button; deferred to a design consistency pass.
