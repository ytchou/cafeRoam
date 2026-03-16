# useUser hook must expose isLoading to prevent auth-state flash

**Date:** 2026-03-16
**Context:** fix/home-page-filters — gating reviews fetch on auth state

**What happened:**
`ShopDetailClient` was changed to pass `enabled: !!user` to `useShopReviews` (correct fix — stops anonymous 401 calls). The `isAuthError` guard was updated to `!user || isAuthError` to surface the login prompt for unauthenticated visitors. However, `useUser()` initializes `user = null` synchronously and only resolves auth state after an async `getUser()` call. This caused authenticated users to see the "login to see reviews" prompt flash on every page load — visibly wrong.

**Root cause:**
`useUser` returned `{ user }` without `isLoading`. Consumers couldn't distinguish "definitely unauthenticated" from "auth resolving." Any condition using `!user` as a branch selector will misbehave during the async resolution window.

**Prevention:**
Any hook that wraps an async initialization (auth, session, profile) MUST expose an `isLoading: boolean` (initially `true`, set to `false` after the first response). Consumers gate UI branches on `!isLoading && !user`, not just `!user`.
