# Provider wiring gaps — constructor args not propagated to factory callsite
**Date:** 2026-02-26
**Context:** Provider adapter implementation for AnthropicLLMAdapter (taxonomy injection)

**What happened:** `AnthropicLLMAdapter` accepted `taxonomy: list[TaxonomyTag]` at construction time and filtered all LLM-returned tags against it. The adapter tests all passed. The factory was updated. But `scheduler.py` still called `get_llm_provider()` with no taxonomy, so the adapter received `[]` and silently filtered out every enrichment tag the LLM produced — returning empty results in production.

**Root cause:** Unit tests for the adapter used a hand-supplied taxonomy. The production callsite (scheduler) was a separate file not covered by those unit tests. The wiring gap was invisible until code review.

**Prevention:**
- When adding a required constructor parameter to an adapter, always search callers of the factory function (`get_*_provider()`) and update them in the same commit.
- For parameters that require runtime data (DB-loaded taxonomy, secrets), add a comment to the factory documenting what callers must supply: `# Callers must supply taxonomy loaded from DB`.
- Consider an integration smoke test that exercises the full `process_job_queue()` flow against a minimal mock, which would have caught the empty taxonomy.
