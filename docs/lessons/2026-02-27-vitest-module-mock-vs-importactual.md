# Vitest: vi.doMock + importActual silently bypasses the mock

**Date:** 2026-02-27
**Context:** Sentry client config test in `app/__tests__/sentry-init.test.ts`

**What happened:**
The test used `vi.doMock('@sentry/nextjs', ...)` then immediately called `vi.importActual('@sentry/nextjs')` to get the Sentry module. `importActual` bypasses all mocks and returns the real module, so `mockInit` was never the mock — it was the real `Sentry.init`. The test fell back to `expect(true).toBe(true)` which always passed. CI was green, but the test provided zero coverage guarantee.

**Root cause:**
`vi.doMock` is not hoisted — it runs at the call site, so dynamic imports after it get the mock. But `vi.importActual` explicitly requests the real implementation, overriding any mock. The test inadvertently combined the two in a way that cancelled out.

**Prevention:**
For testing module-level side effects (code that runs at import time, like `Sentry.init`):

1. Use `vi.mock('@sentry/nextjs', () => ({ init: vi.fn() }))` at the TOP of the file — Vitest hoists this before imports
2. In `beforeEach`: call `vi.clearAllMocks()` AND `vi.resetModules()` to reset state between tests
3. In each test: use `vi.stubEnv('VAR', 'value')` then dynamic `await import('...module...')` to re-execute module-level code with the new env
4. Assert against the mock directly: `const Sentry = await import('@sentry/nextjs'); expect(Sentry.init).toHaveBeenCalledWith(...)`

Never use `vi.importActual` when you need the mock — it is explicitly designed to bypass mocks.
