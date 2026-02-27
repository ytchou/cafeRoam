# Refactoring to shared factories can silently weaken test assertions

**Date:** 2026-02-27
**Context:** Test infrastructure refactor — settings/page.test.tsx migrated from inline mocks to shared `makeSession()` factory

**What happened:**
When refactoring `settings/page.test.tsx` to use `makeSession()`, the Authorization header assertion was loosened from `'Bearer test-token'` (exact match against the inline token) to `expect.stringContaining('Bearer ')` (passes for any Bearer token). The inline token `'test-token'` was hardcoded; the factory produces a JWT-format token, so the agent loosened the assertion rather than using the factory's actual token value.

**Root cause:**
The inline session used a known sentinel (`{ access_token: 'test-token' }`). After switching to the factory, the token value changed. Instead of using the factory's token in the assertion, the agent broadened the match to avoid thinking about it.

**Prevention:**
When refactoring tests to use shared factories:
1. Lift the factory call to module level if the assertion needs to reference the exact values it produces
2. Never loosen an assertion "to make it work" — if the assertion must change, verify the new assertion is equally specific
3. Pattern: `const testSession = makeSession()` at module level → use `testSession.access_token` in both the mock setup AND the assertion
