# Instrument all LLM call sites, not just one

**Date:** 2026-04-12
**Context:** DEV-317 — API spend monitoring tab for admin dashboard

**What happened:** api_usage_logger was integrated only into `enrich_shop()` in both the Anthropic and OpenAI adapters. Four other Anthropic methods (`extract_menu_data`, `assign_tarot`, `classify_photo`, `summarize_reviews`) and three other OpenAI methods made live API calls that were never logged. The embedding adapter (`embed`/`embed_batch`) was also completely uninstrumented despite the plan acceptance criteria explicitly listing "embed" as an expected task in the cost breakdown.

**Root cause:** When wiring a cross-cutting concern (logging, tracing, cost tracking) into an adapter, it's natural to implement it in one method first as a prototype and then move on — without auditing all other call sites in the same file.

**Prevention:** When adding instrumentation to an adapter:

1. Before closing the task, grep for all method definitions that call the external SDK in that adapter file.
2. Confirm each SDK call site is instrumented (or has a documented reason not to be).
3. Check the plan acceptance criteria for explicit "expected tasks" — if a task name is listed there, verify its call site is wired.
