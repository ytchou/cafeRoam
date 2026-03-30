# Internal hooks with env-var guards don't need mocks in tests

**Date:** 2026-03-30
**Context:** DEV-111 map pin progressive disclosure — ShopPreviewCard analytics mock

**What happened:** `shop-preview-card.test.tsx` mocked `@/lib/posthog/use-analytics` (an internal hook) with `vi.mock(...)`. The mock was flagged as a "mock at boundaries only" violation. On inspection, the hook always returns `{ capture }` — the PostHog key guard is **inside the callback**, not in the hook itself. Without `NEXT_PUBLIC_POSTHOG_KEY`, `capture()` is a no-op. The mock was hiding regressions in the hook for no benefit.

**Root cause:** The hook's structure looks like it could return early (`if (!key) return;`), but that early return is inside `useCallback`, not the hook body. Easy to misread when skimming.

**Prevention:** Before mocking an internal hook for analytics/telemetry, read the actual hook implementation. If the guard is inside the callback (not the hook body), the hook always returns a callable and no mock is needed. Only mock at the true boundary: the HTTP call (`fetchWithAuth`) or the third-party SDK (`posthog-js`).
