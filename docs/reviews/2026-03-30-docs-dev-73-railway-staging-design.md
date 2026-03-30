# Code Review Log: docs/dev-73-railway-staging-design

**Date:** 2026-03-30
**Branch:** docs/dev-73-railway-staging-design
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (8 total, 1 false positive skipped)

| #   | Severity  | File:Line                                              | Description                                                                                     | Flagged By              |
| --- | --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Important | `app/__tests__/sentry-config.test.ts:27`               | `delete process.env.X` bypasses vi.stubEnv tracking — flaky test isolation                      | Bug Hunter              |
| 2   | Important | `app/__tests__/sentry-config.test.ts`                  | server + edge Sentry configs have identical changed logic but zero test coverage                | Architecture            |
| 3   | Minor     | `scripts/doctor.sh:190`                                | `railway --version` error output could appear as version string in pass message                 | Bug Hunter              |
| 4   | Minor     | `.env.example:43`                                      | Missing padding before `#` comment breaks column alignment                                      | Standards               |
| 5   | Minor     | `sentry.server.config.ts:5`, `sentry.edge.config.ts:5` | `NEXT_PUBLIC_` prefix semantically misleading in server/edge configs (functional but confusing) | Standards, Architecture |
| 6   | Minor     | `app/__tests__/sentry-config.test.ts:12,26`            | DSN `'https://test@sentry.io/123'` is placeholder, violates project's realistic test data rule  | Test Philosophy         |
| 7   | Minor     | `app/__tests__/sentry-config.test.ts:8`                | Test name describes env var name, not user behavior — violates project naming rule              | Test Philosophy         |

### False Positive Skipped

- `backend/Dockerfile:12` — Architecture claimed chown in same RUN layer defeats Docker caching. **Incorrect** — the chown text is static and never changes independently; what invalidates the layer is lock file changes, same as before.

### Validation Results

All remaining 7 issues confirmed valid or debatable (fix anyway per skill rules).

## Fix Pass 1

**Pre-fix SHA:** e7fcdf32684a38b5cdf58dc5fd8a1d02b11f437b

**Issues fixed:**

- [Important] `app/__tests__/sentry-config.test.ts:27` — Replaced `delete process.env.X` with `vi.stubEnv('', '')`, added `afterEach(() => vi.unstubAllEnvs())`
- [Important] `app/__tests__/sentry-config.test.ts` — Added server config and edge config describe blocks (2 tests each)
- [Minor] `scripts/doctor.sh:190` — Separated `railway --version` into var; stderr redirected to /dev/null
- [Minor] `.env.example:43` — Fixed padding before # comment
- [Minor] `sentry.server.config.ts:5`, `sentry.edge.config.ts:5` — Added clarifying comments on NEXT*PUBLIC* server availability
- [Minor] `app/__tests__/sentry-config.test.ts:12,26` — Replaced placeholder DSN with realistic format
- [Minor] `app/__tests__/sentry-config.test.ts:8` — Renamed test cases to describe observable behavior

**Issues skipped (false positives):**

- `backend/Dockerfile:12` — Dockerfile chown/cache claim was incorrect (chown text is static)

**Batch Test Run:**

- `pnpm test` — PASS (1020 tests)

## Re-Verify Pass 1

_Agents re-run: Bug Hunter, Architecture_
_Agents skipped (Minor-only): Standards, Test Philosophy_
_Agents skipped (no code findings): Plan Alignment_

### Previously Flagged Issues — Resolution Status

- [Important] `sentry-config.test.ts:27` — ✓ Resolved
- [Important] `sentry-config.test.ts` server/edge coverage — ✓ Resolved
- [Minor] `doctor.sh:190` — ✓ Resolved
- [Minor] `.env.example:43` — ✓ Resolved
- [Minor] `sentry.server/edge.config.ts:5` — ✓ Resolved
- [Minor] test DSN placeholder — ✓ Resolved
- [Minor] test name framing — ✓ Resolved

### New Issues Found

None.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-30-docs-dev-73-railway-staging-design.md
