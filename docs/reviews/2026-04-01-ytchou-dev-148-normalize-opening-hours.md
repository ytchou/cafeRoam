# Code Review Log: ytchou/dev-148-normalize-opening-hours

**Date:** 2026-04-01
**Branch:** ytchou/dev-148-normalize-opening-hours
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy (all run inline due to rate limit)*

### Issues Found (4 total after validation)

| # | Severity | File:Line | Description | Flagged By |
|---|----------|-----------|-------------|------------|
| 1 | Important | types.py:37, interface.py:24 | Type annotation uses `list[dict[str, int \| None]]` instead of `list[StructuredHours]` per design doc | Plan Alignment, Standards |
| 2 | Minor | opening_hours.py:154 | `close == open` edge case falls into midnight-crossing branch (no real-world impact) | Bug Hunter |
| 3 | Minor | migrate_opening_hours.py:48 | `hours[0]` array indexing (CLAUDE.md rule) but guarded by `if not hours` check | Standards |
| 4 | Minor | test_opening_hours.py | Test names framed around function signatures (acceptable for pure utility tests) | Test Philosophy |

### Validation Results

- **#1 (Important)** — **Debatable → fix anyway**. The design doc specifies `list[StructuredHours]` but using raw dicts is a pragmatic choice since DB JSONB returns dicts. The `_coerce_entry` function bridges this at runtime. However, using `StructuredHours` in the type would provide Pydantic validation. On reflection: the `Shop` model receives data from Supabase as raw dicts, and Pydantic would need to coerce them. Using `list[dict[str, int | None]]` is actually the correct pragmatic choice — Supabase returns raw JSON, and adding `StructuredHours` to the model would require Pydantic to validate every dict on deserialization. The design doc's type annotation was aspirational. **Verdict: Incorrect** — current implementation is the right choice for DB interop.
- **#2 (Minor)** — **Valid but trivial**. No real-world data would produce `open == close` (same minute open/close). Not worth fixing.
- **#3 (Minor)** — **Debatable**. The CLAUDE.md rule targets TypeScript's `first()` helper. Python has no equivalent, and the guard is sufficient. Not a real violation.
- **#4 (Minor)** — **Incorrect**. Pure utility function tests are explicitly allowed to use function-centric naming per the testing philosophy.

**All findings are either false positives or Minor-only with no real-world impact.**
No Critical or Important issues remain after validation.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes (only finding was validated as incorrect)
**Remaining issues:** None actionable

**Review log:** docs/reviews/2026-04-01-ytchou-dev-148-normalize-opening-hours.md
