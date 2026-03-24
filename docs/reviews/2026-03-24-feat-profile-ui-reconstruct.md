# Code Review Log: feat/profile-ui-reconstruct

**Date:** 2026-03-24
**Branch:** feat/profile-ui-reconstruct
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)_

### Issues Found (10 total)

| Severity  | File:Line                                                    | Description                                                                                                                                                                                 | Flagged By                              |
| --------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Critical  | backend/services/checkin_service.py:129                      | `shop_photo_url` query selects non-existent `photo_urls` column on `shops` table — should use `shop_photos(url)` via join table (see `lists_service.py:20` for correct pattern)             | Bug Hunter                              |
| Important | app/(protected)/profile/page.test.tsx:23-28                  | Mock boundary violation: `vi.mock('@/lib/hooks/use-user')` mocks an internal hook rather than the Supabase boundary — `@/lib/supabase/client` is already mocked and is the correct boundary | Standards, Test Philosophy              |
| Important | components/stamps/polaroid-section.tsx:18,30                 | `visibleCount` shows `{visibleCount} recent visits` but is capped at `MAX_PREVIEW=3`; a user with 10 stamps sees "3 recent visits" — factually incorrect                                    | Bug Hunter, Architecture                |
| Important | components/stamps/polaroid-section.tsx:57-73                 | Memory card `div` with `role="button"` has no `aria-label` — screen readers announce "button" with no name                                                                                  | Bug Hunter, Architecture                |
| Minor     | backend/services/checkin_service.py:142                      | `shop_photos[0] if shop_photos else None` bypasses project's `first()` helper per CLAUDE.md                                                                                                 | Standards, Architecture, Plan Alignment |
| Minor     | components/stamps/polaroid-section.tsx:95                    | Diary note uses straight quotes (`&quot;`) instead of typographic curly quotes (`&ldquo;`/`&rdquo;`) as specified in plan/design doc                                                        | Plan Alignment                          |
| Minor     | components/stamps/polaroid-section.tsx                       | Scroll snap (`snap-x snap-mandatory` / `snap-start`) not implemented on horizontal scroll container as specified in design doc                                                              | Plan Alignment                          |
| Minor     | components/profile/checkin-history-tab.test.tsx:40           | Naming violation: `'does not render star ratings'` describes rendering absence, not user outcome                                                                                            | Test Philosophy                         |
| Minor     | components/stamps/polaroid-section.test.tsx:20-22            | Test data violation: `Shop 0`–`Shop 5` are placeholder names; rest of codebase uses realistic Taiwan cafe names                                                                             | Test Philosophy                         |
| Minor     | backend/tests/services/test_checkin_service.py:82-84,121-123 | Test data violation: `user_id="user-1"`, `shop_id="shop-1"` placeholder strings; other tests in same file use realistic IDs like `"user-mei-ling-001"`                                      | Test Philosophy                         |

## Fix Pass 1

**Pre-fix SHA:** 2606e9313520f1b810dd7170dbee223c245e61fe

**Issues fixed:**

- [Critical] backend/services/checkin_service.py:129 — Fixed `shop_photos(url)` join; updated test mocks to nested structure; used `first()` helper (commit a58f7ff)
- [Important] app/(protected)/profile/page.test.tsx:23-28 — Removed `useUser` mock; extended Supabase boundary mock with `getUser`/`onAuthStateChange` (commit e1d9864)
- [Important] components/stamps/polaroid-section.tsx:18,30 — Use `stamps.length` (total) instead of `visibleCount` (capped preview count) (commit 74afb1d)
- [Important] components/stamps/polaroid-section.tsx:57-73 — Added `aria-label` to `role="button"` memory cards (commit 74afb1d)
- [Minor] backend/services/checkin_service.py:142 — `first(shop_photos)["url"]` instead of `[0]` (commit a58f7ff)
- [Minor] components/stamps/polaroid-section.tsx:95 — Typographic curly quotes `&ldquo;`/`&rdquo;` (commit 74afb1d)
- [Minor] components/stamps/polaroid-section.tsx — Added scroll snap `snap-x snap-mandatory` / `snap-start` (commit 74afb1d)
- [Minor] components/profile/checkin-history-tab.test.tsx:40 — Renamed to user-journey framing (commit 4848478)
- [Minor] components/stamps/polaroid-section.test.tsx:20-22 — Realistic Taiwan cafe names; added >3 stamps regression test (commit 74afb1d)
- [Minor] backend/tests/services/test_checkin_service.py:82-84,121-123 — Realistic user/shop IDs (commit 4848478)

**Batch Test Run:**

- `pnpm test` — PASS (860 passed, 157 test files)
- `cd backend && uv run pytest` — PASS (472 passed)

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy_

### Previously Flagged Issues — Resolution Status

All 10 original issues: Resolved

### New Issues Found (1 — Minor)

| Severity | File:Line                                 | Description                                                                                                                                 | Flagged By                      |
| -------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Minor    | components/stamps/polaroid-section.tsx:61 | `md:snap-align-none` is not a valid Tailwind utility class (dead code; container's `md:snap-none` already disables snap context on desktop) | Plan Alignment, Test Philosophy |

**Fix:** Removed the invalid class (commit 849395e). Tests re-verified: 10/10 pass.

**Early exit:** No Critical or Important issues remain after Pass 1.

## Final State

**Iterations completed:** 1 (+ 1 minor regression fix)
**All Critical/Important resolved:** Yes
**Remaining issues:** None

---

### Validation Results

All 10 issues validated — no false positives. All proceed to fix.

| #   | Severity  | Verdict         | Reason                                                                                     |
| --- | --------- | --------------- | ------------------------------------------------------------------------------------------ |
| 1   | Critical  | Valid           | `shops.photo_urls` column does not exist in schema — confirmed by migration                |
| 2   | Important | Valid           | `useUser` is internal app code, not a boundary; Supabase client already mocked             |
| 3   | Important | Valid           | `visibleCount` (capped at 3) ≠ total visits; label is factually wrong for >3 stamps        |
| 4   | Important | Valid           | `role="button"` div has no accessible name; screen reader announces "button" with no label |
| 5   | Minor     | Debatable → Fix | Guarded `[0]` is safe but violates CLAUDE.md naming rule; use `first()` per convention     |
| 6   | Minor     | Valid           | Code uses `&quot;` (straight); plan spec requires `&ldquo;`/`&rdquo;`                      |
| 7   | Minor     | Valid           | Design doc explicitly specifies scroll snap; not implemented                               |
| 8   | Minor     | Valid           | Test name describes implementation absence, not user action/outcome                        |
| 9   | Minor     | Valid           | `Shop 0`–`Shop 5` are placeholder names; CLAUDE.md requires realistic data                 |
| 10  | Minor     | Valid           | `user-1`/`shop-1` placeholder IDs inconsistent with file's established pattern             |
