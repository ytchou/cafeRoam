# Code Review Log: dev/dev-198-search-vocab

**Date:** 2026-04-03
**Branch:** dev/dev-198-search-vocab
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet)*

### Issues Found (1 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Minor | backend/services/query_classifier.py:31-36 | Mixed CJK+Latin queries (e.g. "cafe拿") use only the CJK length rule, ignoring Latin characters. The design doc specifies "2+ CJK OR 3+ Latin" but the implementation uses CJK-first precedence, meaning a query with 1 CJK + 4 Latin chars fails the minimum length check. This is an edge case unlikely to occur in practice for Taiwan coffee search. | Bug Hunter |

### Validation Results

| Finding | File:Line | Classification | Reason |
|---------|-----------|---------------|--------|
| Mixed CJK+Latin min-length edge case | backend/services/query_classifier.py:31-36 | Debatable | The design explicitly says "2+ CJK characters OR 3+ Latin characters" — the current code implements CJK-first precedence which is a reasonable simplification for a Taiwan-focused product where mixed-script partial queries are extremely rare. The behavior is deterministic and documented. Fix anyway for correctness but low priority. |

### Notes

- **Plan Alignment:** All 3 chunks complete, all acceptance criteria met, implementation matches design doc.
- **Test Philosophy:** No violations found. Tests use realistic data (actual Taiwan coffee terms), user-journey framing, no mocks (pure function under test).
- **Standards:** All CLAUDE.md rules followed — `re.compile()` at module level, no work in loops (the `any()` short-circuits), provider abstraction respected.
- **Architecture:** No coupling concerns. Change is isolated to classifier + vocabulary. The `_reverse_match` linear scan is O(n) over ~460 terms but acceptable for a per-request classifier.
- **Anthropic adapter test fix:** Correctly updated "amazing brunch" to "amazing decor" because "brunch" was added to ITEM_TERMS, which would have caused the test to fail (brunch is now a valid vocabulary match).
- **Adversarial Review (Codex):** Skipped — CLAUDE_PLUGIN_ROOT not set.

## Fix Pass 1

**Pre-fix SHA:** 7a2a82b1241244fcdf1b75ac0c4a616d5577b2b7
**Issues fixed:**
- [Minor] backend/services/query_classifier.py:31-36 — Implemented true OR logic in `_meets_reverse_min_length`: changed `if cjk_count > 0: return cjk_count >= 2` to `if cjk_count >= 2: return True` + `return (len(query) - cjk_count) >= 3`. Mixed CJK+Latin queries now correctly evaluated.

**Batch Test Run:**
- `cd backend && uv run pytest` — PASS (801 passed, 0 failing, 4.95s)

## Pass 2 — Re-Verify

*Agents re-run (smart routing): Bug Hunter*
*Agents skipped (no findings in previous pass): Standards, Architecture, Plan Alignment, Test Philosophy*

### Previously Flagged Issues — Resolution Status
- [Minor] backend/services/query_classifier.py:31-36 — ✓ Resolved

### New Issues Found (0)
No regressions detected.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes (none existed)
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-03-dev-dev-198-search-vocab.md
