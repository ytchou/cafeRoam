# Code Review Log: feat/shop-followers

**Date:** 2026-03-26
**Branch:** feat/shop-followers
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (16 raw, 14 after dedup/skip)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `components/profile/following-section.tsx:40` | Broken URL when shop.slug is null — produces `/shops/id/` with trailing empty segment | Bug Hunter |
| Critical | `lib/hooks/use-shop-follow.ts:29-30` | Optimistic count can go negative/wrong when data is in error state (count=0, isFollowing=true) | Bug Hunter |
| Important | `supabase/migrations/…_create_shop_followers.sql` + `backend/api/followers.py` | Public RLS SELECT policy missing — count reads use service-role bypass; add policy to reduce elevated credential reliance | Architecture |
| Important | `backend/services/follower_service.py:75-92` | Two separate DB queries for rows + count in get_following — not atomic, adds latency | Bug Hunter, Architecture |
| Important | `lib/hooks/use-shop-follow.ts:12-16` | SWR key does not include auth state — stale unauthenticated response cached after login, `revalidateOnFocus: false` means no auto-recovery | Bug Hunter |
| Important | `lib/hooks/use-shop-follow.ts:47` + `backend/services/follower_service.py:15` | Visibility threshold `>= 10` hardcoded on reconciliation path; server's `visible` not in FollowResponse — server should own the threshold | Architecture |
| Important | `components/shops/shop-actions-row.tsx:105-107,125-127` | Missing `isUserLoading` guard in FollowButton `onRequireAuth` lambdas — authenticated users redirected to login during session load | Standards |
| Important | `supabase/migrations/…_create_shop_followers.sql:13` | SQL comment says "anyone can read aggregate counts" but no public SELECT policy exists — misleads future contributors | Standards |
| Important | `backend/models/types.py`, `lib/types/index.ts`, `backend/services/follower_service.py`, `components/profile/following-section.tsx` | `primary_tag` missing from FollowedShopSummary/FollowedShop — deviation from design spec response shape | Plan Alignment |
| Important | `components/shops/follow-button.test.tsx:15-17` | `useShopFollow` mocked as internal module — should mock at HTTP boundary via MSW per project testing standard | Test Philosophy |
| Minor | `backend/models/types.py` + `lib/types/index.ts` | No `has_more`/`limit` in pagination response — users with >20 follows silently truncated | Bug Hunter |
| Minor | `lib/hooks/use-shop-follow.ts:26,43,53` | Redundant obvious comments violate "minimal comments" standard | Standards |
| Minor | `backend/services/follower_service.py:31,121` | Redundant obvious comments | Standards |
| Minor | `components/shops/follow-button.test.tsx:32,41,50,58,68,76` | Test names describe rendering state, not user journeys | Test Philosophy |
| Minor | `components/shops/follow-button.test.tsx:34,44,53,61,71,79` | `shopId="shop-1"` placeholder instead of realistic ID | Test Philosophy |

### Skipped (False Positives)

| File:Line | Reason |
|-----------|--------|
| `backend/api/followers.py:41-56` — service-role for `is_following` check (leak claim) | `user_id` sourced from JWT claims via `get_optional_user`, not user input — no data leak vector |
| `backend/tests/services/test_follower_service.py` — plan template divergence | Style-only divergence, no behavioral impact |

### Validation Results

All 15 remaining issues classified as Valid or Debatable (lean conservative — fix all).

---

## Fix Pass 1

**Pre-fix SHA:** ac39bca49d669f225fb044554221522709fd97a6
**Post-fix SHA:** fcf368d6922cb1101b38db8be4dc3bd16759562d

**Issues fixed (15):**

- [Critical] `components/profile/following-section.tsx:40` — Conditional slug in href: `${shop.slug ? \`/${shop.slug}\` : ''}`
- [Critical] `lib/hooks/use-shop-follow.ts:27-34` — `Math.max(0, ...)` guard prevents negative optimistic count
- [Important] `supabase/migrations/…_create_shop_followers.sql` — Added `Public can read follower rows` SELECT policy; removed misleading comment; removed service-role workaround comment
- [Important] `backend/services/follower_service.py:82-91` — Collapsed two queries to single with `count="exact"` on range query; added `primary_tag` to SELECT
- [Important] `lib/hooks/use-shop-follow.ts:12` — SWR key includes `?auth=1` suffix when authenticated to bust stale cache on login
- [Important] `lib/hooks/use-shop-follow.ts:44-50` + `backend/models/types.py` + `lib/types/index.ts` — Added `visible` to `FollowResponse`; reconciliation path uses `result.visible` (server owns threshold)
- [Important] `components/shops/shop-actions-row.tsx:105,123` — `onRequireAuth` now delegates to `requireAuth(() => {})` to respect `isUserLoading` guard
- [Important] `backend/models/types.py` + `backend/services/follower_service.py` + `lib/types/index.ts` — Added `primary_tag` to `FollowedShopSummary` / `FollowedShop` and SELECT query
- [Important] `components/shops/follow-button.test.tsx` — Rewrote tests to mock at HTTP boundary (`@/lib/api/fetch` via `vi.hoisted()`); `vi.mock('@/lib/hooks/use-shop-follow')` removed
- [Minor] `backend/models/types.py` + `lib/types/index.ts` — Added `has_more`/`limit` to `FollowingListResponse`; service computes `has_more`
- [Minor] `lib/hooks/use-shop-follow.ts` — Removed redundant inline comments
- [Minor] `backend/services/follower_service.py` — Removed redundant fallback comment
- [Minor] `components/shops/follow-button.test.tsx` — All test names rewritten as user journey descriptions
- [Minor] `components/shops/follow-button.test.tsx` — `shopId="shop-d4e5f6"` (realistic) replaces `"shop-1"` placeholder
- [Minor] N/A — `backend/tests/services/test_follower_service.py` plan template divergence skipped (Incorrect finding)

**Batch Test Run:**
- `pnpm test` — PASS (165 files, 890 tests)
- `cd backend && uv run pytest` — PASS (18 tests)

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-26-feat-shop-followers.md

