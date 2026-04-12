# Code Review Log: ytchou/dev-317-add-daily-api-spend-monitoring-tab-to-admin-dashboard

**Date:** 2026-04-12
**Branch:** ytchou/dev-317-add-daily-api-spend-monitoring-tab-to-admin-dashboard
**Mode:** Pre-PR

## Pass 1 — Full Discovery

_Agents: Bug Hunter (Sonnet), Standards (Sonnet), Architecture (Sonnet), Plan Alignment (Sonnet), Test Philosophy (Sonnet), Design Quality (Sonnet)_

### Issues Found (6 total)

| Severity  | File:Line                                            | Description                                                                                                                    | Flagged By                 |
| --------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| Important | backend/providers/llm/anthropic_adapter.py:210-330   | Missing api_usage_logger on extract_menu_data, assign_tarot, classify_photo, summarize_reviews — 4/5 call sites uninstrumented | Bug Hunter, Plan Alignment |
| Important | backend/providers/llm/openai_adapter.py:201-299      | Missing api_usage_logger on extract_menu_data, classify_photo, summarize_reviews — 3/4 call sites uninstrumented               | Bug Hunter, Plan Alignment |
| Important | backend/providers/embeddings/openai_adapter.py:18-24 | Missing api_usage_logger on embed() and embed_batch() — embedding costs invisible in dashboard                                 | Bug Hunter, Plan Alignment |
| Important | backend/providers/llm/openai_adapter.py:185-196      | prompt_tokens/completion_tokens can be None (Optional[int] per SDK) — will TypeError in compute_llm_cost                       | Bug Hunter                 |
| Minor     | backend/tests/api/test_admin_spend.py:29-51          | Mock rows omit tokens_input/tokens_output — token aggregation path untested                                                    | Test Philosophy            |
| Minor     | backend/providers/scraper/apify_adapter.py:202-207   | Task hardcoded as 'scrape_batch' in \_run_actor — all future Apify tasks will be misattributed                                 | Architecture & Design      |

### Validation Results

| Finding                                   | Status    | Notes                                                          |
| ----------------------------------------- | --------- | -------------------------------------------------------------- |
| Anthropic adapter missing instrumentation | Valid     | 4 methods make API calls without logging — contradicts plan AC |
| OpenAI adapter missing instrumentation    | Valid     | 3 methods make API calls without logging                       |
| Embedding adapter missing instrumentation | Valid     | Plan explicitly lists 'embed' as expected task breakdown       |
| OpenAI usage fields nullable              | Valid     | SDK types are Optional[int]; will crash on None                |
| Test token aggregation gap                | Valid     | Minor — aggregation logic works but path untested              |
| Apify task hardcoded                      | Debatable | Currently correct; fragile if \_run_actor is reused            |

**Skipped (2 false positives):**

- backend/api/admin.py:855 — datetime.fromisoformat in loop is per-row necessity, not a performance violation
- SpendTab.tsx — admin-only component using standard shadcn/ui; no consumer-facing design issues

## Fix Pass 1

**Pre-fix SHA:** 2d5e2a3377c3e27a40e99940ca67265ce61459a2
**Issues fixed:**

- [Important] backend/providers/llm/openai_adapter.py:185-196 — Fixed Optional[int] prompt_tokens/completion_tokens with `or 0`
- [Important] backend/providers/llm/anthropic_adapter.py:210-330 — Added log_api_usage to extract_menu_data, assign_tarot, classify_photo, summarize_reviews
- [Important] backend/providers/llm/openai_adapter.py:201-337 — Added log_api_usage to extract_menu_data, classify_photo, summarize_reviews, assign_tarot
- [Important] backend/providers/embeddings/openai_adapter.py:18-24 — Added usage logging in embed() (task="embed") and embed_batch() (task="embed_batch")
- [Minor] backend/tests/api/test_admin_spend.py:29-51 — Added tokens_input/tokens_output to mock rows; added task-level token assertions
- [Minor/Debatable] backend/providers/scraper/apify_adapter.py:202-207 — Added optional task_name param to \_run_actor (default "scrape_batch")

**Batch Test + Lint Run:**

- `pnpm test` — PASS
- `cd backend && uv run pytest` — PASS
- `pnpm lint` — PASS
- `cd backend && uv run ruff check .` — PASS

## Pass 2 — Re-Verify

_Agents re-run: Bug Hunter, Plan Alignment, Architecture & Design, Test Philosophy_
_Agents skipped (no findings): none_
_Agents skipped (Minor-only): none_

### Previously Flagged Issues — Resolution Status

- [Important] backend/providers/llm/anthropic_adapter.py:210-330 — ✓ Resolved
- [Important] backend/providers/llm/openai_adapter.py:201-299 — ✓ Resolved
- [Important] backend/providers/embeddings/openai_adapter.py:18-24 — ✓ Resolved
- [Important] backend/providers/llm/openai_adapter.py:185-196 — ✓ Resolved
- [Minor] backend/tests/api/test_admin_spend.py:29-51 — ✓ Resolved
- [Minor] backend/providers/scraper/apify_adapter.py:202-207 — ✓ Resolved

### New Issues Found (0)

No regressions or new issues introduced by the fixes.

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-12-ytchou-dev-317-add-daily-api-spend-monitoring-tab-to-admin-dashboard.md
