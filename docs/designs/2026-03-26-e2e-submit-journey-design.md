# E2E: Community Shop Submission User Journey

**Date:** 2026-03-26
**Ticket:** DEV-62
**Hat:** CTO

---

## Overview

Add E2E Playwright coverage for the community shop submission flow (`/submit`). The submit page (DEV-38) has unit tests but zero E2E coverage. This design adds a `@critical` journey test to catch regressions in the submit form, backend queue integration, and submission history display.

## Decisions

| Decision       | Choice                         | Alternative rejected                                                |
| -------------- | ------------------------------ | ------------------------------------------------------------------- |
| API strategy   | Hit real local backend         | Playwright route interception (diverges from existing E2E patterns) |
| Auth wall test | Skip — already in auth.spec.ts | Duplicate in submit.spec.ts (redundant)                             |
| Critical tag   | Yes — `@critical J40`          | No tag (submit is a growth mechanic)                                |
| Data isolation | Unique URLs per run            | DB cleanup in afterEach (unnecessary complexity)                    |

## Architecture

**One new file:** `e2e/submit.spec.ts`

Uses the existing `authedPage` fixture from `e2e/fixtures/auth.ts`. All requests hit the real local FastAPI backend — no route interception.

### Data Strategy

Generate unique Google Maps URLs per test run using `Date.now()` suffix:

```
https://maps.app.goo.gl/e2eTest${Date.now()}
```

No DB cleanup needed. Each run creates fresh submissions that don't collide.

## Test Cases

### `@critical J40 — Community shop submission` (3 tests)

| #   | Test description                                            | Actions                                                           | Assertions                                                                 |
| --- | ----------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Authenticated user submits a shop URL and sees confirmation | Navigate to `/submit`, enter unique Google Maps URL, click submit | Success message visible; submission appears in history with "處理中" badge |
| 2   | Submitting a duplicate URL shows error                      | Submit the same URL from test 1 again                             | Error message visible (409 duplicate); form NOT cleared                    |
| 3   | Invalid URL shows inline validation error                   | Enter `not-a-url`, attempt submit                                 | Inline error "請輸入有效的 Google Maps 連結"; no network request fired     |

### Auth wall coverage

`/submit` added to `auth.spec.ts`'s protected routes list. No separate test in submit.spec.ts.

## Data Flow

```
authedPage fixture (cached JWT)
  → navigates to /submit
  → fills URL input → clicks submit button
  → POST /api/submissions (real local FastAPI)
  → asserts success message
  → asserts submission history row appears
```

## Error Handling

- Async UI updates: `expect().toBeVisible({ timeout: 10_000 })`
- Happy path waits for success message before checking history section
- Duplicate test depends on happy path: use `test.describe.serial()` to guarantee ordering

## Testing Classification

**(a) New e2e journey?**

- [x] Yes — `@critical J40` community shop submission

**(b) Coverage gate impact?**

- [ ] No — only adding tests, no critical-path service code modified
