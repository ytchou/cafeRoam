# Design: Fix Button Click & Page Load Latency

**Date:** 2026-04-04

## Problem

Every authenticated button click (Follow, Save, Check-in) on localhost:3000 takes 1-3 seconds. Root cause: redundant Supabase auth network calls at three layers.

## Root Cause Analysis

### Layer 1 — Middleware (200-800ms per API call, wasted)

`middleware.ts:26` calls `updateSession()` on every request, including `/api/*` routes. `updateSession()` makes two sequential Supabase calls:

1. `getUser()` — **network round-trip** to Supabase auth server (200-800ms)
2. `getSession()` — local JWT decode (~5ms)

For `/api/*` routes (which are in `PUBLIC_PREFIXES`), the middleware immediately returns after `updateSession()` completes — the `user` result is never used. FastAPI validates JWTs independently. This is pure waste.

### Layer 2 — useUser hook (200-800ms per page load, multiplied)

`lib/hooks/use-user.ts:12` calls `getUser()` (network) inside `useEffect` on every component mount. On the shop detail page, `useUser()` is called by 3+ components — each making its own network call. Additionally, `useShopReviews` blocks on `!!user` creating a waterfall (reviews don't fetch until `useUser` resolves).

### Layer 3 — SWR revalidation (unnecessary refetches)

Multiple hooks (`use-user-lists`, `use-user-checkins`, `use-user-stamps`, `use-user-profile`, all `use-owner-*` hooks) lack `revalidateOnFocus: false`. Every tab switch triggers redundant API calls through the middleware.

## Architecture

Three changes remove the three layers of wasted work:

1. **Skip middleware `updateSession()` for `/api/*` routes** — early return with `NextResponse.next()` before the expensive auth call
2. **Replace `getUser()` with `getSession()` in `useUser()` hook** — local JWT decode (~5ms) instead of network call (200-800ms)
3. **Add global `SWRConfig` with `revalidateOnFocus: false`** — prevents all tab-focus refetches

## Components

| Change                   | File                          | Type   |
| ------------------------ | ----------------------------- | ------ |
| Middleware short-circuit | `middleware.ts`               | Modify |
| useUser getSession swap  | `lib/hooks/use-user.ts`       | Modify |
| SWR provider             | `components/swr-provider.tsx` | Create |
| Layout SWR wrapper       | `app/layout.tsx`              | Modify |

## Data Flow (Before vs After)

**Before — Follow button click:**

```
Client: getSession() [local, ~5ms] → fetch('/api/shops/{id}/follow')
  → Middleware: getUser() [NETWORK, 200-800ms] + getSession() [local]
  → API route: proxyToBackend()
  → FastAPI: validate JWT + process
Total: ~500-1500ms
```

**After:**

```
Client: getSession() [local, ~5ms] → fetch('/api/shops/{id}/follow')
  → Middleware: pathname.startsWith('/api') → NextResponse.next() [~0ms]
  → API route: proxyToBackend()
  → FastAPI: validate JWT + process
Total: ~50-200ms
```

## Design Decisions

### Why `getSession()` is safe for `useUser()`

- `useUser()` is only used for UI gating (is logged in? user.id, user.email) — not security decisions
- `onAuthStateChange` (already subscribed in the hook) provides ongoing session updates
- Server-side validation still happens in middleware (for page routes) and FastAPI (for API calls)
- `getSession()` decodes the JWT from local storage — does NOT validate server-side. Acceptable for UI display, never the sole auth check.

### Why skipping middleware for `/api/*` is safe

- All 81 API route handlers are pure proxies via `proxyToBackend()` — they forward the `Authorization` header to FastAPI
- FastAPI validates JWTs independently via its own auth dependency
- The middleware code itself documents this: line 14 comment says "API routes handle their own JWT auth via FastAPI"
- Session cookie refresh is not needed for API routes (client-side SDK handles token refresh via `onAuthStateChange`)

### Why waterfall fix was dropped

The `!!user` guard on `useShopReviews(shop.id, !!user)` was originally planned to be removed. However, once `useUser` resolves via `getSession()` (~5ms instead of 500ms+), the waterfall becomes negligible. Keeping the guard is correct — it prevents unnecessary API calls for unauthenticated users.

### Why per-hook `revalidateOnFocus` was dropped

A global `SWRConfig` sets the default for all hooks, making individual overrides redundant. Hooks that already have `revalidateOnFocus: false` set explicitly are unaffected (explicit options override the provider default).

## Error Handling

- **`getSession()` returns null session:** `session?.user ?? null` handles this — same as `getUser()` returning null user.
- **`useShopReviews` with !!user guard:** Unchanged — reviews don't fetch for unauthenticated users.
- **SWR global config:** Individual hook options override the global default if needed.

## Testing Classification

**(a) New e2e journey?**

- [x] No — no new critical path introduced

**(b) Coverage gate impact?**

- [x] No — no critical-path service touched

## Testing Strategy

- Middleware test: verify `/api/*` routes skip `updateSession()`
- useUser test: verify `getSession` is called (not `getUser`)
- Full test suite: `pnpm test` — existing tests should pass without changes
- Manual: button click latency, auth redirects, tab-switch behavior
