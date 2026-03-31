# ADR: Vocabulary-driven compiled regex for query classifier

Date: 2026-03-31

## Decision

Use a static vocabulary file (`backend/core/search_vocabulary.py`) of plain term lists,
compiled into a `re.compile()` pattern at module level in `query_classifier.py`.

## Context

DEV-122 requires expanding the query classifier from ~15 hardcoded terms per category
to a comprehensive bilingual (zh/en) vocabulary for item_specific and specialty_coffee
detection. Two implementation approaches were considered: frozenset membership lookup
vs. compiled regex from vocabulary list.

## Alternatives Considered

- **Frozenset with word-split:** `frozenset(terms)` + `set(query.split()) & terms`.
  Rejected: requires exact word boundary matches. "手沖咖啡" would not match the term
  "手沖" because the split produces `{"手沖咖啡"}`, not `{"手沖", "咖啡"}`.
  Multi-word English terms ("cold brew") also fail to match when the user types
  "cold brew coffee" since split produces `{"cold", "brew", "coffee"}` and "cold brew"
  is not in the set.

- **Hardcoded regex (current):** Works but vocabulary is embedded in regex syntax,
  making it harder to review, extend, or hand off to non-engineers.

## Rationale

The vocabulary-driven compiled regex approach satisfies all constraints:

1. **Substring matching preserved** — `re.search()` finds "手沖" inside "手沖咖啡"
   and "yirgacheffe" inside "yirgacheffe blend".
2. **Zero per-request cost** — `re.compile()` at module level, consistent with the
   project's performance standards (compile at module level, not per call).
3. **Vocabulary is reviewable** — `search_vocabulary.py` contains plain Python lists
   with no regex syntax. Easy to add terms, easy to audit in PRs.
4. **Normalizer handles input variance** — NFKC + lowercase runs before the regex,
   so terms in the vocabulary file only need to be lowercase. No need to account for
   full-width characters or case variants in the term list itself.

## Consequences

- Advantage: Vocabulary and matching logic are fully decoupled — updating the term list
  requires no changes to classifier logic.
- Advantage: Comprehensive bilingual coverage is achievable without regex complexity.
- Disadvantage: Regex is rebuilt if the module is reloaded (e.g. hot-reload in dev).
  Acceptable — module-level compilation is fast.
- Disadvantage: `re.escape()` is required when building the pattern to prevent terms
  with special characters from breaking the regex.
