# Playwright E2E: three common traps in new test suites

**Date:** 2026-03-16
**Context:** Code review of feat/e2e-testing — first Playwright suite in the project

## 1. waitForURL with negative lookahead always passes

**What happened:** `waitForURL(/(?!\/checkin)/)` was used expecting it to wait until the URL no longer contained `/checkin`. It matches immediately on every URL because a bare negative lookahead without anchoring matches at position 0 of any string.

**Root cause:** `waitForURL(regex)` tests the full URL string (e.g. `http://localhost:3000/checkin/abc`). A regex with only a lookahead and no anchor matches at position 0 — position 0 of any URL is never `/checkin`, so it's always true.

**Prevention:** Use a predicate for negative URL matching:

```typescript
await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
  timeout: 15_000,
});
```

Note: the callback receives a `URL` object, not a string. Use `.pathname`, `.origin`, etc.

---

## 2. Playwright device profiles use different browser engines — match CI install

**What happened:** CI installed only Chromium, but `devices['iPhone 14']` defaults to `defaultBrowserType: 'webkit'`. All mobile project tests errored at browser launch.

**Root cause:** Playwright's device profiles encode the browser type. `iPhone 14` → WebKit; `Pixel 5` → Chromium. When only one browser is installed, other-engine projects fail silently at CI startup.

**Prevention:** When using `devices[]` in `playwright.config.ts`, check `defaultBrowserType` for each device and ensure CI installs all required engines:

```yaml
run: pnpm exec playwright install --with-deps chromium webkit
```

---

## 3. Test state pollution — E2E shared accounts accumulate data

**What happened:** J12 (Create list) left the created list on the shared E2E account after each run. J13 (Cap test) read the current count from the account, so after 3 CI runs the account was at cap before J13 started.

**Root cause:** E2E tests that create data against a shared persistent account must always clean up — `beforeEach`/`afterEach` patterns or API-based cleanup inside the test body.

**Prevention:**

- Always pair create operations with a cleanup in `finally` or at the test end
- Use the app's own API (`page.request.delete(...)`) for cleanup — don't add a test-only delete UI
- Track created resource IDs during the test body for reliable cleanup
