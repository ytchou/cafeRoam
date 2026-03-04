# Code Review Log: feat/checkin-stamps

**Date:** 2026-03-04
**Branch:** feat/checkin-stamps
**HEAD SHA:** 34aa80f4386efd2ec49db51747d301def624d5b7
**Mode:** Pre-PR

---

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Gemini (cross-review)*

### Issues Found (19 total before dedup)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `supabase/migrations/...sql:4` + `lib/supabase/storage.ts:17` | Private buckets (`public=false`) but `getPublicUrl()` used — `<img>` tags cannot carry auth headers; all photos broken for everyone | Bug Hunter, Architecture |
| Important | `components/checkins/photo-uploader.tsx:75` | `URL.createObjectURL(file)` called in render loop — new blob URL created on every render, never revoked; memory leak | Bug Hunter, Architecture, Standards |
| Important | `lib/supabase/storage.ts:9-13` | Extension hardcoded as `webp` but `contentType` is the real file MIME type — metadata mismatch | Bug Hunter, Standards |
| Important | `backend/api/shops.py:61,75` | `photo_urls[0]` accessed without empty-array guard — IndexError if any row has empty array | Bug Hunter, Architecture |
| Important | `backend/api/shops.py:68-72` | Anon preview query fetches ALL rows without `LIMIT` — unbounded at scale | Architecture |
| Important | `backend/api/shops.py:35` | No upper bound on `limit` query parameter — DoS/exfiltration risk | Bug Hunter, Architecture |
| Important | `components/checkins/checkin-photo-grid.tsx:41` | SWR key does not include `isAuthenticated` — user sees stale anon cache after login | Gemini |
| Minor | `components/stamps/stamp-passport.tsx:87-101` | Page dots call `setCurrentPage(i)` but don't scroll the container — non-functional UI | Bug Hunter, Architecture, Gemini |
| Minor | `components/checkins/checkin-photo-grid.tsx:51` | Authenticated count badge shows `data.length` (paginated, max 9), not total count | Bug Hunter, Plan Alignment |
| Minor | `lib/hooks/use-user-stamps.ts` + `components/stamps/stamp-passport.tsx` | `StampData` interface defined in both files independently | Architecture |
| Minor | `components/checkins/photo-uploader.tsx` | No deduplication of File objects in `handleFiles` — same photo can be added twice | Gemini |
| Minor | `app/(protected)/checkin/[shopId]/page.tsx` | Stamp toast missing stamp SVG image per design doc | Plan Alignment |
| Minor | `backend/tests/api/test_shop_checkins.py:16,46,65,80` | Tests mock internal `api.shops.get_admin_db` (not a system boundary); line 88 asserts on ORM chain implementation detail | Test Philosophy, Standards |
| Minor | `lib/supabase/storage.test.ts` | Test describe/it blocks named after function signatures, not user outcomes | Test Philosophy |
| Minor | `lib/hooks/use-user-stamps.test.ts` | Test describe/it blocks named after hook internals, not user outcomes | Test Philosophy |

### Validation Results

- **Skipped (false positive):** Bug Hunter issue — "POST to `/api/checkins` but no proxy route exists" — `app/api/checkins/route.ts` exists; route was added in a prior commit on this branch.
- **Skipped (deferred architecture):** `get_admin_db` used for authenticated user queries bypassing RLS — per MEMORY.md, per-request JWT client is explicitly deferred pending DB migrations. Admin client is required for the anon branch (anon role has no SELECT on `check_ins`). Both branches using admin is a known limitation.
- **Skipped (intentional):** PDPA disclosure always visible outside collapsible — more PDPA-compliant than design doc specified; intentionally retained.
- **Skipped (functionally equivalent):** Toast links to `/profile` vs `/profile#stamps` — profile page has only one section, no functional difference.
- **Skipped (already fixed):** `menuPhotoPreviewUrl` in `app/(protected)/checkin/[shopId]/page.tsx` was already fixed in prior `/simplify` session (useMemo + useEffect cleanup).
- **Proceeding to fix:** 7 Important + 1 Critical issues, plus Minor fixes.

---

## Fix Pass 1

*(Populated in Phase 6)*
