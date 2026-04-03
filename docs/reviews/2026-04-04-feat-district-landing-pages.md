# Code Review Log: feat/district-landing-pages

**Date:** 2026-04-04
**Branch:** feat/district-landing-pages
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Design Quality (Sonnet)_
_Adversarial Review (Codex): skipped — CLAUDE_PLUGIN_ROOT not configured_

### Issues Found (3 total)

| Severity  | File:Line                                   | Description                                                                                                                                                                                               | Flagged By   |
| --------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Important | backend/api/shops.py:144                    | `shop.pop("districts")` happens AFTER `response_data` is built from `shop.items()` on line 137, leaking raw `districts` join data into the shop detail API response alongside the intended `district` key | Bug Hunter   |
| Minor     | backend/services/district_service.py:115    | Uses `vibe_rows[0]` instead of project's `first()` helper — CLAUDE.md mandates using `first()` for safe array access                                                                                      | Standards    |
| Minor     | app/explore/districts/[slug]/layout.tsx:3-6 | Dead static metadata completely shadowed by page's `generateMetadata` — serves no purpose and could confuse future developers                                                                             | Architecture |

### Validation Results

| Finding                           | File:Line                                   | Classification | Notes                                                                                                                                                                                                                                                                                                       |
| --------------------------------- | ------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leaked districts in shop response | backend/api/shops.py:144                    | **Valid**      | The pop happens after dict comprehension. Other nested joins (shop_photos, shop_tags, shop_claims, shop_content) are popped BEFORE line 137. This one was missed. Response includes both `"districts": {"slug": "...", "name_zh": "..."}` (raw) and `"district": {"slug": "...", "nameZh": "..."}` (clean). |
| Unsafe [0] array access           | backend/services/district_service.py:115    | **Valid**      | `first()` is imported on line 7 but not used here. Guard exists on line 113, so technically safe, but violates project convention for new code.                                                                                                                                                             |
| Dead layout metadata              | app/explore/districts/[slug]/layout.tsx:3-6 | **Valid**      | Layout's static `metadata` export is fully overridden by page's `generateMetadata`. The layout could be reduced to just returning children, or removed entirely.                                                                                                                                            |

---

## Fix Pass 1

**Pre-fix SHA:** 5488baa0af73f5d10ec87250c421b34cd240d52e

**Issues fixed:**

- [Important] backend/api/shops.py:137 — Moved `shop.pop("districts", None)` before `response_data` dict comprehension to prevent raw Supabase join key from leaking into the API response
- [Minor] backend/services/district_service.py:115 — Replaced `vibe_rows[0]` with `(first(vibe_rows) or {})` to comply with project's safe array access convention
- [Minor] app/explore/districts/[slug]/layout.tsx — Deleted layout file; static metadata was fully shadowed by page's `generateMetadata`; layout returned only `children` with no added behavior

**Batch Test Run:**

- `pnpm test` (vitest) — PASS 1098, FAIL 6 (all 6 pre-existing, unrelated to this feature; confirmed by running the failing tests against pre-fix commit)
- `cd backend && uv run pytest` — PASS 823/823 in 14.83s

---

## Pass 2 — Re-Verify

_Agents re-run (smart routing): Bug Hunter, Standards & Conventions, Architecture & Design_
_Agents skipped (no findings in pass 1): Plan Alignment, Design Quality_

### Previously Flagged Issues — Resolution Status

- [Important] backend/api/shops.py:144 — ✓ Resolved (pop now precedes dict comprehension)
- [Minor] backend/services/district_service.py:115 — ✓ Resolved (`first()` pattern applied; `or {}` is harmless defensive guard)
- [Minor] app/explore/districts/[slug]/layout.tsx:3-6 — ✓ Resolved (file deleted; no routing impact in Next.js App Router)

### New Issues Found

None.

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-04-feat-district-landing-pages.md
