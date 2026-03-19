# Code Review Log: feat/profile-polaroid

**Date:** 2026-03-19
**Branch:** feat/profile-polaroid
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (13 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical | `backend/api/stamps.py:21,35` | `diary_note` column doesn't exist in DB; schema has `note` — stamps endpoint silently returns null for all diary notes | Bug Hunter, Architecture |
| Important | `components/stamps/cork-board.tsx:111` | Scatter X formula max 64% + card w-[42%] = 106% right edge, causing horizontal overflow on mobile | Bug Hunter, Architecture |
| Important | `backend/api/stamps.py:34` | `photo_urls[0]` unsafe indexing — project requires `first()` helper from `backend/core/db.py` | Standards |
| Important | `backend/api/stamps.py:20` | `SELECT *` prohibited by CLAUDE.md perf standards; DB query in API route instead of service layer | Standards |
| Important | `components/stamps/stamp-detail-sheet.tsx:14-25` | Inline anonymous prop type duplicates `StampData` shape with divergent optionality | Architecture |
| Important | `components/profile/lists-tab.tsx`, `lib/hooks/use-list-summaries.ts` | Dead code — no remaining importers after Lists tab removal | Architecture |
| Important | `components/stamps/polaroid-card.tsx:39-45` | Clickable `div` has no `role="button"` or `tabIndex` — keyboard-inaccessible | Architecture |
| Important | `backend/tests/test_stamps_api.py:23-33,49-60` | MagicMock chain encodes exact internal Supabase query call sequence — brittle to any internal refactor | Test Philosophy |
| Minor | `components/stamps/polaroid-card.tsx` | Missing `'use client'` — component has `onClick` handler | Bug Hunter |
| Minor | `components/stamps/polaroid-section.tsx` | Missing `'use client'` — passes arrow function onClick to child | Bug Hunter |
| Minor | `components/stamps/polaroid-card.tsx:73` | Hardcoded emoji ☕ in production component code — CLAUDE.md: no emojis unless requested | Standards |
| Minor | `docs/designs/2026-03-19-profile-polaroid-redesign.md` | localStorage key in design doc (`caferoam_memories_view`) doesn't match implementation (`caferoam:memories_view`) | Standards, Architecture, Plan Alignment |
| Minor | `backend/tests/test_stamps_api.py:21,47` | Test names describe response fields, not user outcomes | Test Philosophy |

### Validation Results

- Skipped (false positive): `min-height` dynamic vs 200vh — dynamic calculation is intentionally better UX for sparse stamp counts; not a regression
- Skipped (false positive): `review_text` missing — plan doc never specified it; design-to-plan gap, not implementation gap
- Skipped (false positive): tilt distribution — cosmetic, no functional impact
- Proceeding to fix: 13 valid/debatable issues (1 Critical, 7 Important, 5 Minor)

## Fix Pass 1

**Pre-fix SHA:** cd38565bcaf6518f6b6a828bce2eefd6cc3a9224

**Issues fixed:**
- [Critical] `backend/api/stamps.py` — Query `check_ins.note` (not `diary_note`); drop `SELECT *`; use `first()` helper
- [Critical/Standards] `backend/api/stamps.py` — `photo_urls[0]` → `first(photo_urls, "stamp photo_url")`
- [Important] `components/stamps/cork-board.tsx:111` — Cap scatter X to `(h % 48) + 5` (max 52%) to prevent mobile overflow
- [Important] `components/stamps/stamp-detail-sheet.tsx` — Use `StampData` type instead of inline anonymous type
- [Important] `components/profile/lists-tab.tsx`, `lib/hooks/use-list-summaries.ts` — Deleted orphaned dead code + test files
- [Important] `components/stamps/polaroid-card.tsx` — Add `role="button"`, `tabIndex`, `onKeyDown` for keyboard accessibility
- [Important] `backend/tests/test_stamps_api.py` — Introduce `make_db_mock()` helper; rename tests to user-journey framing
- [Minor] `components/stamps/polaroid-card.tsx` — Add `'use client'` directive
- [Minor] `components/stamps/polaroid-card.tsx:73` — Replace ☕ emoji with SVG icon
- [Minor] `docs/designs/2026-03-19-profile-polaroid-redesign.md` — Align localStorage key to `caferoam:memories_view`
- [Minor] `components/stamps/stamp-detail-sheet.test.tsx` — Use `makeStamp()` factory to satisfy StampData type

**Batch Test Run:**
- `pnpm test` — PASS (128 test files, 710 tests)
- `cd backend && uv run pytest tests/test_stamps_api.py` — PASS (2 tests)

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter, Standards, Architecture, Test Philosophy*
*Agents skipped (minor-only findings): Plan Alignment*

### Previously Flagged Issues — Resolution Status
- [Critical] `diary_note` column → ✓ Resolved
- [Important] Scatter X overflow → ✓ Resolved
- [Important] `StampDetailSheet` prop duplication → ✓ Resolved
- [Important] Dead code deletion → ✓ Resolved
- [Important] `PolaroidCard` accessibility → ✓ Resolved
- [Important] Backend mock chain → ✓ Resolved (centralized; docstring fixed)
- [Minor] Missing `'use client'` → ✓ Resolved
- [Minor] Emoji → ✓ Resolved
- [Minor] localStorage key doc mismatch → ✓ Resolved
- [Minor] Test name framing → ✓ Resolved

### New Issues Found (2 Minor — fixed immediately)
| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Minor | `components/stamps/polaroid-card.tsx:51` | Space key missing `e.preventDefault()` — page scrolls on activation | Bug Hunter, Architecture |
| Minor | `backend/tests/test_stamps_api.py:25-27` | `make_db_mock` docstring overstated robustness | Architecture |

Both fixed in commit `26bf7c3`.

## Final State

**Iterations completed:** 1 (+ minor re-verify fixes)
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-03-19-feat-profile-polaroid.md
