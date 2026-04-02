# Code Review Log: fix/dev-157-vocab-normalize

**Date:** 2026-04-02
**Branch:** fix/dev-157-vocab-normalize
**Mode:** Pre-PR

## Pass 1 — Full Discovery

*Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Test Philosophy (Sonnet)*
*Skipped: Plan Alignment (no plan doc), Design Quality (no frontend files)*

### Issues Found (7 total)

| Severity | File:Line | Description | Flagged By |
|----------|-----------|-------------|------------|
| Critical→Debatable | `anthropic_adapter.py:8` | `from services.query_normalizer` crosses provider→services architecture boundary; no other provider imports from `services/` | Standards |
| Important | `anthropic_adapter.py:27–29` | Substring direction inverted: `norm in n` checks if input is substring of vocab key; should be `n in norm`; tests passed coincidentally | Bug Hunter, Architecture |
| Important | `anthropic_adapter.py:408–413` | No deduplication — duplicate LLM outputs produce duplicate canonical terms in output list | Bug Hunter |
| Important | `test_anthropic_adapter.py:280,~308` | `"Single Origin Ethiopian"` would match `"single origin"` vocab term after direction fix; missing `test_coffee_origins_empty_when_no_vocab_match` | Architecture, Test Philosophy |
| Minor | `anthropic_adapter.py:406–407` | `tool_input.get("menu_highlights", [])` returns `None` for explicit JSON null value | Bug Hunter |
| Minor | `anthropic_adapter.py:27–29` | O(n) linear scan in fallback; inconsistent with compiled-regex pattern in query_classifier.py | Standards, Architecture |
| Minor | `test_anthropic_adapter.py:254,272` | Test names describe implementation rather than user journey | Standards |

### Validation Results

| # | Finding | Verdict | Notes |
|---|---------|---------|-------|
| A | services/ import | Debatable | Function is pure utility; architecture rule is real; fix warranted |
| B | Substring direction | Valid | Concrete logic bug; tests passed for wrong reason |
| C | No deduplication | Valid | Real correctness gap |
| D | Test data + missing test | Valid | "Single Origin Ethiopian" would break after fixing B |
| E | None guard | Valid | Runtime crash path for valid LLM JSON |
| F | O(n) scan | Incorrect | Not a performance problem at scale; reviewer self-refuted |
| G | Test naming | Debatable | Names are acceptable for infrastructure-layer tests |

## Fix Pass 1

**Pre-fix SHA:** 6e02d12c8d691a1cd31592eda0ca05af7844902a
**Post-fix SHA:** db1c2515def8136108527197ce565c20b2cc6db6

**Issues fixed:**
- [Debatable→A] `anthropic_adapter.py:8` — Removed `services.query_normalizer` import; inlined `_normalize()` using `re` + `unicodedata`; updated `_ITEM_VOCAB`/`_SPECIALTY_VOCAB`/`_to_vocab_term` to use it
- [Important→B] `anthropic_adapter.py:41` — Fixed substring direction: `norm in n` → `n in norm`
- [Important→C] `anthropic_adapter.py:421–426` — Wrapped both comprehensions with `list(dict.fromkeys(...))`
- [Important→D] `test_anthropic_adapter.py:280` — Changed `"Single Origin Ethiopian"` → `"freshly sourced beans"`; added `test_coffee_origins_empty_when_no_vocab_match`
- [Minor→E] `anthropic_adapter.py:419–420` — Changed `get("...", [])` → `get("...") or []` for both fields

**Issues skipped:**
- F (O(n) scan) — Incorrect finding; not a real issue at this scale
- G (test naming) — Debatable; existing names acceptable for infrastructure tests

**Batch Test Run:**
- `cd backend && uv run pytest tests/providers/test_anthropic_adapter.py` — PASS (18/18)

## Pass 2 — Re-Verify

*Agents re-run: Bug Hunter, Standards, Architecture, Test Philosophy (smart routing — all flagged issues in pass 1)*

### Previously Flagged Issues — Resolution Status

- [Debatable→A] `anthropic_adapter.py:8` — ✓ Resolved: `services/` import gone; `_normalize()` inline
- [Important→B] `anthropic_adapter.py:41` — ✓ Resolved: `n in norm` confirmed
- [Important→C] `anthropic_adapter.py:421–426` — ✓ Resolved: `list(dict.fromkeys(...))` on both fields
- [Important→D] `test_anthropic_adapter.py` — ✓ Resolved: test data fixed; new empty-match test added
- [Minor→E] `anthropic_adapter.py:419–420` — ✓ Resolved: `or []` guards in place

### New Issues Found (0 blocking)

**Minor note (not blocking):** With direction now correctly `n in norm`, short vocab keys could match against any input containing them as substrings. This is the intended design behavior, not a regression. Depends on vocabulary term length distribution.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:**
- [Minor] `test_anthropic_adapter.py:254,272` — Test names describe implementation not user journey (debatable for infrastructure-layer tests; not blocking)
- [Minor note] Substring fallback design: short vocab keys will match any input containing them; pre-existing design choice now active

**Review log:** `docs/reviews/2026-04-02-fix-dev-157-vocab-normalize.md`
