# Code Review Log: feat/ga4-consent

**Date:** 2026-03-26
**Branch:** feat/ga4-consent
**Mode:** Pre-PR
**HEAD SHA:** a1a5ad76c89041da337dd858a533159d8a1fcb74

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (12 total)

| Severity  | File:Line                                                                   | Description                                                                                                                                                                                                                          | Flagged By               |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| Critical  | `lib/posthog/provider.tsx`                                                  | PDPA opt-out gap: no `posthog.opt_out_capturing()` when consent → `denied`; PostHog stays active mid-session. No idempotency guard on `init()` — double-init on remount. `mockOptOut` in tests is dead in production.                | Bug Hunter, Architecture |
| Critical  | `lib/analytics/ga4.tsx`                                                     | GA4 consent `default`/`update` calls in `useEffect` — `window.gtag` may not be defined when effects fire, silently dropping both calls for returning visitors with pre-granted consent. Violates consent mode v2 timing requirement. | Bug Hunter, Architecture |
| Important | `app/shops/[shopId]/[slug]/shop-detail-client.tsx:71-78`                    | `trackShopDetailView` refires on every `searchParams` change, not just mount — overcounts GA4 shop views.                                                                                                                            | Bug Hunter               |
| Important | `lib/consent/provider.tsx:28`                                               | Consent cookie missing `Secure` flag — PDPA tamper-resistance gap.                                                                                                                                                                   | Bug Hunter, Architecture |
| Important | `lib/analytics/__tests__/ga4-events.test.ts:16-19`                          | `vi.resetModules()` in `afterEach` instead of `beforeEach` — test isolation wrong order; first test may see stale module cache.                                                                                                      | Bug Hunter               |
| Important | `lib/analytics/ga4-events.ts` (no call sites)                               | `trackSignupCtaClick` defined and tested but never called in any page — planned instrumentation incomplete per plan Task 8.                                                                                                          | Plan Alignment           |
| Minor     | `lib/analytics/ga4.tsx:7-11` + `lib/analytics/ga4-events.ts:1-5`            | Duplicate `window.gtag` global interface declaration across two files.                                                                                                                                                               | Bug Hunter, Standards    |
| Minor     | `lib/posthog/__tests__/provider.test.tsx:59,77,96`                          | `setTimeout` polling instead of `waitFor` — timing-sensitive, fragile in CI.                                                                                                                                                         | Standards, Architecture  |
| Minor     | `lib/analytics/ga4-events.ts`                                               | Undocumented asymmetry: GA4 helpers always fire (cookieless modeling), PostHog truly blocked. No comment explaining intentional difference.                                                                                          | Architecture             |
| Minor     | `.env.example`                                                              | Missing `NEXT_PUBLIC_GA_MEASUREMENT_ID=` entry. Known blocked by global-guard hook; DEV-42 created for manual fix.                                                                                                                   | Plan Alignment           |
| Minor     | `ga4-events.test.ts`, `ga4.test.tsx`, `provider.test.tsx` (posthog+consent) | Test names use implementation language ("initializes PostHog", "renders nothing", "on mount") instead of user-journey framing.                                                                                                       | Test Philosophy          |
| Minor     | `lib/analytics/__tests__/ga4-events.test.ts:58`                             | `trackSearch('test query')` — placeholder test data.                                                                                                                                                                                 | Test Philosophy          |

### Validation Results

All 12 findings validated. 0 false positives.

| Finding                                                   | Classification         |
| --------------------------------------------------------- | ---------------------- |
| Critical-1 (PostHog opt-out gap + double-init)            | Valid                  |
| Critical-2 (GA4 consent default timing race)              | Valid                  |
| Important-3 (trackShopDetailView refires on searchParams) | Valid                  |
| Important-4 (Secure cookie flag)                          | Debatable — fix anyway |
| Important-5 (resetModules in afterEach)                   | Valid                  |
| Important-6 (trackSignupCtaClick never called)            | Valid                  |
| Minor-7 (duplicate Window.gtag declaration)               | Valid                  |
| Minor-8 (setTimeout instead of waitFor)                   | Valid                  |
| Minor-9 (undocumented GA4/PostHog asymmetry)              | Debatable — fix anyway |
| Minor-10 (.env.example missing GA ID)                     | Valid (DEV-42 tracked) |
| Minor-11 (test naming violations)                         | Valid                  |
| Minor-12 (placeholder test data)                          | Valid                  |

## Fix Pass 1

**Pre-fix SHA:** a1a5ad76c89041da337dd858a533159d8a1fcb74
**Post-fix SHA:** 0f28ff069632c494e4e7796f128e0f376fc4b7ab

**Issues fixed:**

- [Critical] `lib/posthog/provider.tsx` — Added module-level `posthogInitialized` flag; `opt_out_capturing()` on consent denied; `opt_in_capturing()` on re-grant; new TDD test covering revocation path
- [Critical] `lib/analytics/ga4.tsx` — Added `ensureGtagQueue()` bootstrapping `window.dataLayer` + `window.gtag` before consent commands; both effects now queue reliably before GA4 script loads
- [Important] `app/shops/[shopId]/[slug]/shop-detail-client.tsx` — Removed `searchParams` from `useEffect` deps; fires only on mount
- [Important] `lib/consent/provider.tsx` — Conditional `; Secure` flag on HTTPS
- [Important] `lib/analytics/__tests__/ga4-events.test.ts` — `vi.resetModules()` moved to `beforeEach`; placeholder test data fixed
- [Important] `components/shops/shop-actions-row.tsx` + `app/page.tsx` — `trackSignupCtaClick` instrumented at `'card'` and `'banner'` CTAs
- [Minor] `lib/analytics/ga4-events.ts` — Removed duplicate `Window.gtag` declaration; added consent asymmetry comment
- [Minor] `lib/posthog/__tests__/provider.test.tsx` — Converted positive-assertion `setTimeout` to `waitFor`
- [Minor] All test files — Renamed tests to user-journey framing

**Issues skipped:**

- Minor-10 (`.env.example`) — Blocked by global-guard hook; DEV-42 created

**Batch Test Run:**

- `pnpm test` — PASS (906/906, +1 new test)

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet)_
_Agents skipped (Minor-only): Standards, Test Philosophy_

### Previously Flagged Issues — Resolution Status

- [Critical] PostHog opt-out gap — ✓ Resolved
- [Critical] GA4 consent default timing — ✓ Resolved
- [Important] trackShopDetailView overcounting — ✓ Resolved
- [Important] Secure cookie flag — ✓ Resolved
- [Important] vi.resetModules() in afterEach — ✓ Resolved
- [Important] trackSignupCtaClick not instrumented — ✓ Resolved
- [Minor] Duplicate Window.gtag declaration — ✓ Resolved
- [Minor] setTimeout polling (positive assertions) — ✓ Resolved; negative assertions retained (not convertible with waitFor)
- [Minor] Undocumented GA4/PostHog asymmetry — ✓ Resolved
- [Minor] .env.example missing GA ID — ~ Known-blocked (DEV-42)

### New Issues Found

None. No regressions.

_Note from Architecture agent: `posthogInitialized` module-level flag was flagged as potential test isolation hazard. Investigated and confirmed false alarm — `vi.resetModules()` in `beforeEach` clears `../provider` from cache, so the flag resets to `false` on each test's fresh module evaluation._

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**

- [Minor] `.env.example` missing `NEXT_PUBLIC_GA_MEASUREMENT_ID=` — blocked by global-guard; tracked in DEV-42
- [Minor] Negative-assertion `setTimeout` polling in PostHog tests (lines 58, 95) — not convertible to `waitFor` for absence checks; acceptable

**Review log:** docs/reviews/2026-03-26-feat-ga4-consent.md
