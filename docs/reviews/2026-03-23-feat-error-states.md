# Code Review Log: feat/error-states

**Date:** 2026-03-23
**Branch:** feat/error-states
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet)_
_Skipped: Plan Alignment (no plan doc found), Test Philosophy (no test files in diff)_

### Issues Found (7 total)

| Severity  | File:Line                                                                | Description                                                                                                    | Flagged By               |
| --------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Critical  | `app/error.tsx:10`                                                       | `error` prop silently dropped — no Sentry capture, no console.error, digest discarded                          | Bug Hunter               |
| Important | `tsconfig.json:17`                                                       | `vitest/globals` in root tsconfig leaks test globals into all source files                                     | Architecture             |
| Important | `components/ui/error-state.tsx:45`, `app/not-found.tsx:12`               | Raw `<button>`/`<Link>` instead of Button primitive — missing focus-visible ring (a11y) and vertical centering | Architecture, Bug Hunter |
| Important | `components/ui/coming-soon.tsx:32`, `components/ui/error-state.tsx:34`   | `tracking-tight` on CJK heading text violates DESIGN.md rule                                                   | Standards                |
| Important | `app/not-found.tsx:15`                                                   | Incomplete font stack — missing `var(--font-noto-sans-tc)` and `system-ui`                                     | Standards                |
| Important | `components/ui/coming-soon.tsx:3-9`, `components/ui/error-state.tsx:3-9` | `HEADING_STYLE`/`BODY_STYLE` constants duplicated verbatim across both files                                   | Architecture, Bug Hunter |
| Minor     | `app/not-found.tsx`                                                      | CTA button rendered outside the ComingSoon card, visually disconnected                                         | Architecture, Standards  |

### Validation Results

All 7 issues validated. 0 false positives. All proceed to fix.

---

## Fix Pass 1

**Pre-fix SHA:** 64828c5fe25d606e9f5c62bbcc0d74ffff558588
**Fix commit:** e8934d2

**Issues fixed:**

- [Critical] `app/error.tsx` — Added `Sentry.captureException(error)` in `useEffect`
- [Important] `tsconfig.json` — Moved `vitest/globals` to `tsconfig.test.json`; wired `vitest.config.ts` typecheck
- [Important] `error-state.tsx` — Use Button primitive (`size="lg"`), remove `tracking-tight`
- [Important] `coming-soon.tsx` — Add `action` prop slot, remove `tracking-tight`
- [Important] `not-found.tsx` — Use `Button asChild` + `Link`; pass CTA via `action` prop; fix font stack
- [Important] `lib/typography.ts` — Extracted shared `HEADING_STYLE`/`BODY_STYLE` constants
- [Minor] `not-found.tsx` — CTA now inside ComingSoon card via `action` prop

**Batch Test Run:**

- `pnpm test` — PASS (155 files, 843 tests)

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Standards, Architecture (all 3 flagged issues in pass 1)_

### Previously Flagged Issues — Resolution Status

- [Critical] `app/error.tsx:10` — ✓ Resolved (Sentry capture added)
- [Important] `tsconfig.json:17` — ✓ Resolved (vitest/globals scoped to tsconfig.test.json)
- [Important] `error-state.tsx` + `not-found.tsx` — ✓ Resolved (Button primitive used)
- [Important] `coming-soon.tsx:32`, `error-state.tsx:34` — ✓ Resolved (tracking-tight removed)
- [Important] `not-found.tsx:15` — ✓ Resolved (BODY_STYLE from shared lib)
- [Important] duplicate constants — ✓ Resolved (lib/typography.ts)
- [Minor] `not-found.tsx` CTA — ✓ Resolved (action prop inside card)

### New Issues Found

None. 0 regressions.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-23-feat-error-states.md
