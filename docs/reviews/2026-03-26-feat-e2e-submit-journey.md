# Code Review Log: feat/e2e-submit-journey

**Date:** 2026-03-26
**Branch:** feat/e2e-submit-journey
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (10 total before validation)

| Severity  | File:Line                              | Description                                                              | Flagged By                                          |
| --------- | -------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------- |
| Critical  | playwright.config.ts:42-47             | webServer always starts; breaks E2E_BASE_URL-targeted CI runs            | Bug Hunter, Standards, Architecture, Plan Alignment |
| Important | e2e/submit.spec.ts:5                   | Module-scoped uniqueUrl collides across mobile/desktop parallel projects | Bug Hunter, Architecture                            |
| Important | playwright.config.ts:10                | .trim() on env values strips legitimate trailing whitespace              | Bug Hunter                                          |
| Important | e2e/submit.spec.ts:47                  | .text-red-600 CSS selector couples test to implementation                | Standards, Architecture                             |
| Important | e2e/ (aggregate)                       | E2E suite at 13 files exceeds CLAUDE.md 3-5 critical paths policy        | Standards                                           |
| Important | app/api/shops/[shopId]/                | Scope creep: API route rename not in plan                                | Plan Alignment                                      |
| Minor     | playwright.config.ts:7-11              | Manual .env.local parser doesn't strip surrounding quotes from values    | Architecture                                        |
| Minor     | e2e/submit.spec.ts:71-83               | No network-settle await before apiCalled assertion                       | Bug Hunter                                          |
| Minor     | app/api/**tests**/proxy-routes.test.ts | Pre-existing HTTP verb naming pattern in test names (out of scope)       | Test Philosophy                                     |
| Minor     | e2e/submit.spec.ts:5                   | e2eTest prefix accumulates test submissions in DB; no afterAll cleanup   | Test Philosophy                                     |

### Validation Results

| #   | Severity  | Classification | Reason                                                                                                |
| --- | --------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Critical  | **Valid**      | webServer guard provably removed; breaks CI against remote URLs                                       |
| 2   | Important | **Valid**      | Real parallel-project race condition with module-scope Date.now()                                     |
| 3   | Important | **Incorrect**  | `.trim()` is correct behavior; standard dotenv convention; NOT trimming causes failures               |
| 4   | Important | **Valid**      | CSS class selector couples test to implementation; CLAUDE.md explicitly prohibits this                |
| 5   | Important | **Debatable**  | Policy pre-existing violation; PR adds a legitimately critical path; CLAUDE.md policy may need update |
| 6   | Important | **Incorrect**  | Rename was required fix for Next.js 16 startup crash (confirmed in commit a5ed055), not scope creep   |
| 7   | Minor     | **Valid**      | Regex doesn't strip surrounding quotes; quoted values in .env.local include literal " chars           |
| 8   | Minor     | **Incorrect**  | Assertion is safe — client-side validation is synchronous; toBeVisible() await is sufficient          |
| 9   | Minor     | **Incorrect**  | Pre-existing pattern out of scope; new tests added by this PR use correct user-journey framing        |
| 10  | Minor     | **Debatable**  | Orphaned rows real but harmless given reset infrastructure; add cleanup for best practice             |

**Issues to fix (Valid):** 1, 2, 4, 7
**Issues to fix (Debatable, lean conservative):** 10
**Issues skipped (Incorrect):** 3, 6, 8, 9
**Policy note (Debatable, not a code fix):** 5 — E2E suite policy needs CLAUDE.md update, separate work

## Fix Pass 1

**Pre-fix SHA:** fd09b8721ccfc46cb0220efe28bf9034736eb709

**Commits:**

- `fix(review): restore E2E_BASE_URL guard for webServer; strip quotes from env values`
- `fix(review): isolate uniqueUrl per project; replace CSS selector with text assertion`

**Issues fixed:**

- [Critical] playwright.config.ts:42-47 — Restored `process.env.E2E_BASE_URL ? undefined : { ... }` conditional
- [Important] e2e/submit.spec.ts:5 — Moved uniqueUrl to beforeAll with workerInfo.project.name suffix
- [Important] e2e/submit.spec.ts:47 — Replaced `page.locator('.text-red-600')` with `page.getByText('This URL has already been submitted')`
- [Minor] playwright.config.ts:10 — Added `.replace(/^(['"])(.*)\1$/, '$2')` to strip surrounding quotes from env values

**Issues skipped (false positives confirmed):**

- playwright.config.ts:10 `.trim()` — standard dotenv behavior, correct
- e2e/submit.spec.ts:71-83 network-settle — client-side validation is synchronous, assertion is safe
- [id]→[shopId] route rename — required Next.js 16 startup crash fix (confirmed via commit a5ed055)
- proxy-routes.test.ts naming — pre-existing, new tests use correct user-journey framing

**Batch Test Run:**

- `pnpm test` (Vitest) — PASS (934 tests)
- Backend tests — skipped (no Python changes in this branch)

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Plan Alignment_
_Agents skipped (Minor-only findings): Test Philosophy_

### Previously Flagged Issues — Resolution Status

- [Critical] playwright.config.ts — ✓ Resolved
- [Important] e2e/submit.spec.ts:5 uniqueUrl collision — ✓ Resolved
- [Important] e2e/submit.spec.ts:47 CSS selector — ✓ Resolved
- [Minor] playwright.config.ts quote stripping — ✓ Resolved

### New Issues Found

None — all agents confirm no regressions from the fixes.

### Early Exit

No Critical or Important issues remain after Pass 1. Loop terminated.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes

**Remaining issues (minor/policy):**

- [Policy] E2E spec count at ~11 files exceeds CLAUDE.md's "3-5 critical paths" guideline — pre-existing, submit.spec.ts is a legitimately critical path. Recommend updating CLAUDE.md to reflect actual scale.
- [Minor] e2e/submit.spec.ts — No afterAll cleanup for test submissions; e2eTest-prefixed rows accumulate in DB. No delete API exists yet; cleanup should be added when a delete endpoint is built.

**Review log:** docs/reviews/2026-03-26-feat-e2e-submit-journey.md
