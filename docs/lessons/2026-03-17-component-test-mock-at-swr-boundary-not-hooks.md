# Component tests: mock at SWR boundary, not at the hook layer

**Date:** 2026-03-17
**Context:** vibe-tags feature — `page.test.tsx` mocked `useVibes` and `useVibeShops` internal hooks

**What happened:** Component tests used `vi.mock('@/lib/hooks/use-vibes', ...)` and `vi.mock('@/lib/hooks/use-vibe-shops', ...)` to control what data components received. This made the tests pass but silently bypassed all hook logic — any refactor of `useVibes`'s return shape or transform would be invisible to the component test.

**Root cause:** The component had internal hooks as the first dependency visible to the test author. Mocking the closest thing to hand is natural but wrong.

**Prevention:**
1. Always mock at the SWR boundary: `vi.mock('swr', () => ({ default: vi.fn() }))`
2. Use `vi.mocked(useSWR).mockImplementation((key) => { if (key === '/api/explore/vibes') return { data: [...] }; ... })`
3. The real `useVibes` hook then runs its actual logic through the mocked SWR. A rename or transform in the hook will surface as a test failure — which is the correct behavior.
4. `useGeolocation` is acceptable to mock (thin wrapper over `navigator.geolocation` — a browser system boundary).
