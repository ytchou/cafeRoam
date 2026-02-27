# Code Review Log: feat/test-improvement-phase-0-1

**Date:** 2026-02-27
**Branch:** feat/test-improvement-phase-0-1
**HEAD SHA:** 34f882f663f22b3c9a20c788fcc08859bb985ebc
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Opus), Standards (Sonnet), Architecture (Opus), Plan Alignment (Sonnet)_

### Issues Found (4 valid, 5 false positives)

| Severity  | File:Line                                                   | Description                                                                                                                                    | Flagged By               |
| --------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Important | `app/(protected)/settings/page.test.tsx:91`                 | Authorization header assertion loosened from exact token to `stringContaining('Bearer ')` — misses regression where wrong token is sent        | Bug Hunter               |
| Important | `backend/tests/factories.py`                                | `make_shop_row` includes RPC-only fields (`similarity`, `tag_ids`) that force callers to `pop()` before `Shop()` construction — easy to misuse | Architecture             |
| Minor     | `backend/tests/services/test_search_service.py:114`         | Redundant `tag_ids=["quiet", "wifi-reliable"]` override — factory default already matches                                                      | Bug Hunter               |
| Minor     | `backend/tests/factories.py`, `lib/test-utils/factories.ts` | Non-deterministic `datetime.now()`/`new Date()` timestamps — trap for future test authors                                                      | Bug Hunter, Architecture |

### Validation Results

- Skipped (false positive): `test_search_service.py:35,53,92,110` — Standards flagged pre-existing assertions on lines not modified by this PR
- Skipped (false positive): `login.test.tsx`, `signup.test.tsx` — Architecture flagged scope creep; the plan only adds new tests to these files, not full refactors
- Skipped (false positive): `mocks.test.ts`, `factories.test.ts` descriptions — Infrastructure self-tests; user-journey framing rule applies to product feature tests, not test-utility tests
- Skipped (false positive): `makeSession` shallow vs deep merge — Intentional design; no bug, caller uses `makeSession({ user: makeUser({ ... }) })` for partial override
- Proceeding to fix: 4 valid issues (2 Important, 2 Minor)

Plan Alignment: **No misalignments found — all planned tasks complete**

## Fix Pass 1

**Pre-fix SHA:** 34f882f663f22b3c9a20c788fcc08859bb985ebc

**Issues fixed:**

- [Important] `settings/page.test.tsx:91` — Lifted `testSession` to module level; tightened Authorization header assertion to exact token via template literal (`Bearer ${testSession.access_token}`)
- [Important] `backend/tests/factories.py` — Split `make_shop_row` into `make_shop()` (clean model) + `make_shop_row()` (extends with RPC fields); fixed non-deterministic `datetime.now()` with `_TS` sentinel; updated `test_factories.py` tests accordingly
- [Minor] `backend/tests/services/test_search_service.py:114` — Removed redundant `tag_ids` override (factory default already matched)
- [Minor] `lib/test-utils/factories.ts` — Replaced `new Date().toISOString()` with `TS` constant

**Fix commits:** f7ba2ad, 8573335, a048cd1

## Pass 2 — Re-Verify (Smart Routing)

_Agents re-run: Bug Hunter, Architecture_
_Agents skipped (no findings in Pass 1): Plan Alignment_

### Previously Flagged Issues — Resolution Status

- [Important] settings/page.test.tsx:91 — ✓ Resolved
- [Important] backend/tests/factories.py (timestamps + split) — ✓ Resolved
- [Minor] test_search_service.py:114 redundant override — ✓ Resolved
- [Minor] factories.ts non-deterministic timestamps — ✓ Resolved

### New Issues Found: None

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None (one pre-existing Minor on unmodified line in test_search_service.py:109-110 — out of scope)

**Review log:** docs/reviews/2026-02-27-feat-test-improvement-phase-0-1.md
