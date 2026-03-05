# Code Review Log: feat/user-profile

**Date:** 2026-03-05
**Branch:** feat/user-profile
**Mode:** Pre-PR
**HEAD SHA:** b532214d2fba628e72bf57b1e65ba7c52e678aa4

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Gemini (cross-review)*

### Issues Found (19 total)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | `backend/services/profile_service.py:59` | `update_profile` blocks event loop (missing `asyncio.to_thread`) | Bug Hunter, Standards, Architecture |
| 2 | Important | `backend/models/types.py:87,94` | `shop_name` declared non-nullable (`str`) but JOIN returns `None` for orphaned shops → Pydantic ValidationError → 500 | Gemini |
| 3 | Important | `backend/services/profile_service.py:17-21` | `get_profile` — unhandled `APIError` when `profiles` row missing → 500 leak | Gemini |
| 4 | Important | `backend/models/types.py:66` | `avatar_url` accepts any string — no HTTPS validation | Bug Hunter, Architecture, Plan Alignment |
| 5 | Important | `backend/tests/test_profile_api.py:43-45` | Auth test accepts 422; should assert `== 401` only | Standards |
| 6 | Important | `app/(protected)/settings/page.tsx:99` | Avatar upload: only size check, no MIME type check; XSS risk from SVG in public bucket | Bug Hunter |
| 7 | Important | `backend/services/profile_service.py:50-57` | Sentinel conflation: cannot distinguish null-as-clear from null-as-not-provided in `update_profile`; user cannot clear display_name | Bug Hunter |
| 8 | Important | `app/(protected)/settings/page.tsx:110` | Avatar path uses `Date.now()` → `upsert: true` is a no-op; each upload creates new storage object | Bug Hunter, Gemini |
| 9 | Minor | `components/stamps/stamp-passport.tsx:85-104` | Page dots desync with swipe navigation (currentPage not updated on scroll) | Bug Hunter |
| 10 | Minor | `backend/tests/test_profile_service.py:18,47,65,77` | Test names are implementation-framed, not user-journey-framed | Standards |
| 11 | Minor | `backend/tests/test_profile_service.py:65-74` | `assert_called()` does not verify payload passed to `update()` | Standards |
| 12 | Minor | `app/(protected)/settings/page.test.tsx:45,79` | Test names leak internal method names ("calls signOut", "calls API, signs out") | Test Philosophy |
| 13 | Minor | `components/stamps/stamp-detail-sheet.test.tsx:28` | Test name describes React lifecycle, not user outcome | Test Philosophy |
| 14 | Minor | `backend/services/lists_service.py:14-43` | `get_summaries` fetches all list_items + shop_photos to get count (bounded by 3-list cap) | Architecture |
| 15 | Minor | `backend/tests/test_profile_api.py:*` | Backend test names implementation-framed (not user-journey) | Standards |

### Debatable / Will Not Fix

| Issue | Reason |
|-------|--------|
| Avatar upload bypasses `lib/supabase/storage.ts` | Consistent with `handleDeleteAccount` in same file; larger refactor out of scope |
| `shop_mrt` vs design-specified `shop_neighborhood` + `shop_cover_photo` | MRT is the correct Taiwan geography proxy; design deviation is intentional |
| `useListSummaries` vs extending `useUserLists` | Better architectural separation; intended deviation noted in plan |
| `profileInitialized` ref prevents multi-tab refresh | Minor edge case, UX concern not a data loss risk |
| `handleSaveProfile` shows generic error message | MVP-acceptable, no business logic affected |
| Test cleanup in pre-existing `test_lists.py` | Pre-existing code, not introduced by this PR |
| 4 parallel API requests on profile mount | Intentional SWR pattern; noted as acceptable |

### Validation Results

*(Populated after Phase 5 validation)*
