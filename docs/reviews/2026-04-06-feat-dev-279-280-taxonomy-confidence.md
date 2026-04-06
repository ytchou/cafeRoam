# Code Review Log: feat/dev-279-280-taxonomy-confidence

**Date:** 2026-04-06
**Branch:** feat/dev-279-280-taxonomy-confidence
**Mode:** Pre-PR

## Pass 1 — Inline Review (Small Diff)

_Reviewed by: Sonnet orchestrator (inline)_
_Skipped: Plan Alignment, Design Quality, Test Philosophy, Architecture, Adversarial Review (Codex)_
_Reason: Small diff (4 files, 108 lines changed)_

### Issues Found (2 total)

| Severity  | File:Line               | Description                                                                                                                                                                                             | Flagged By    |
| --------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Important | lib/types/index.ts:44   | `confidence` added as required field on shared TaxonomyTag interface; breaks existing test fixtures in tag-confirmation.test.tsx and review-form.test.tsx that construct TaxonomyTag without confidence | Inline Review |
| Important | backend/api/shops.py:35 | `_extract_taxonomy_tags` has new confidence filtering + passthrough logic with no test coverage; critical path per CLAUDE.md                                                                            | Inline Review |

## Fix Pass 1

**Pre-fix SHA:** ea16b5c82fb988bf2f2a6afd71fcf9f6c2b56621

**Issues fixed:**

- [Important] lib/types/index.ts:44 — Changed `confidence: number` to `confidence?: number`; updated sort in attribute-chips.tsx to use `?? 0`
- [Important] backend/api/shops.py:35 — Added 4 unit tests in `TestExtractTaxonomyTags` covering threshold filtering, boundary values, None handling, and confidence passthrough

**Batch Test Run:**

- `pnpm test` — FAIL (1 test in page.test.tsx — MOCK_SHOP had collapsed group) → fixed in follow-up commit
- `cd backend && uv run pytest` — FAIL (4 existing tests missing confidence in fixtures) → fixed in follow-up commit

**Follow-up fixes:**

- backend/tests/api/test_shops.py — Added `confidence` to 4 shop_tags fixtures, updated 2 taxonomyTags assertions
- app/shops/[shopId]/[slug]/page.test.tsx — MOCK_SHOP expanded to 3 ambience tags so group starts open

**Final test counts:**

- Frontend: 1237/1237 passing
- Backend: 863/863 passing

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None
