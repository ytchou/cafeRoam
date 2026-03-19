# Adding a hook to a page component silently breaks page tests

**Date:** 2026-03-20
**Context:** Map view UI rebuild — added `useUser` to `page.tsx` to auth-gate semantic search

**What happened:**
Adding `useUser` to `FindPageContent` caused `app/page.test.tsx` and `app/__tests__/find-page.test.tsx` to throw `@supabase/ssr: Your project's URL and API key are required`. The hook calls `createClient()` which reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — env vars absent in the Vitest test environment. The tests were passing before; the hook addition silently broke them.

**Root cause:**
Page-level integration tests mock all data hooks (useShops, useSearch, etc.) but not auth hooks (useUser). Any hook that crosses a system boundary (auth, DB, HTTP) needs a corresponding `vi.mock` in every test file that renders the parent component.

**Prevention:**
When adding any hook to a component that reaches outside the component's own state, search for test files that render that component and add the mock before committing:
```bash
grep -r "import.*page\|render.*FindPage\|render.*Page" --include="*.test.*" -l
```
Then add `vi.mock('@/lib/hooks/use-user', () => ({ useUser: () => ({ user: null, isLoading: false }) }))` to each.
