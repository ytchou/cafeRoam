# Hybrid LLM Routing — Design Doc

**Date:** 2026-04-10
**Ticket:** [DEV-304](https://linear.app/ytchou/issue/DEV-304/add-openai-provider-adapter-and-enable-claude-batch-api-to-cut)
**Milestone:** Beta Launch
**Author:** Yung-Tang Chou
**ADRs:**

- [docs/decisions/2026-04-10-hybrid-llm-routing.md](../decisions/2026-04-10-hybrid-llm-routing.md)
- [docs/decisions/2026-04-10-defer-batch-api.md](../decisions/2026-04-10-defer-batch-api.md)

## Problem

Per-shop enrichment cost (~$0.62/shop on-demand Claude Sonnet 4.6) makes Beta Launch seeding of 100+ Taipei shops economically borderline. The dominant cost driver is `extract_menu_data` (vision OCR with high output tokens), followed by `enrich_shop` (complex taxonomy reasoning). `classify_photo`, `summarize_reviews`, and `assign_tarot` are much cheaper but still run on Claude models.

## Goal

Reduce per-shop enrichment cost meaningfully by routing each `LLMProvider` protocol method to the most cost-effective model for that task, **without** regressing taxonomy tag quality (which is load-bearing for search relevance — see ADR 2026-02-24).

## Non-Goals

- **Anthropic Batch API integration** — deferred to a follow-up ticket (see [defer-batch-api ADR](../decisions/2026-04-10-defer-batch-api.md)). This would add ~50% on the `enrich_shop` leg but requires async polling, 24h latency handling, and new queue state — too much regression surface for one PR.
- **Changes to the `LLMProvider` protocol** — handlers and scheduler stay untouched.
- **Changes to the worker queue or scheduler** — zero new job types, zero conditional paths added to the pipeline.

## Decision

Add a new `HybridLLMAdapter` that composes `AnthropicLLMAdapter` + a new `OpenAILLMAdapter` and dispatches each of the five protocol methods to the right provider. Routing decisions live in source code, not runtime config.

### Routing Table

| Method              | Provider  | Model var                              | Rationale                                                |
| ------------------- | --------- | -------------------------------------- | -------------------------------------------------------- |
| `enrich_shop`       | Anthropic | `anthropic_model` (Claude Sonnet 4.6)  | Complex zh-TW taxonomy, ADR 2026-02-24 quality gate      |
| `extract_menu_data` | OpenAI    | `openai_classify_model` (GPT-5.4-mini) | Vision OCR, simple JSON schema, 7.5x cheaper than Sonnet |
| `classify_photo`    | OpenAI    | `openai_classify_model` (GPT-5.4-mini) | Vision classification, cheaper than Haiku                |
| `summarize_reviews` | OpenAI    | `openai_classify_model` (GPT-5.4-mini) | Structured text, cheaper than Haiku                      |
| `assign_tarot`      | OpenAI    | `openai_nano_model` (GPT-5.4-nano)     | Fixed-list title matching, trivial task                  |

### Architecture

```
backend/providers/llm/
├── interface.py            # LLMProvider protocol (unchanged)
├── _tool_schemas.py        # NEW — shared JSON schemas for tool/function calls
├── anthropic_adapter.py    # Modified — imports schemas from _tool_schemas.py
├── openai_adapter.py       # NEW — OpenAILLMAdapter
├── hybrid_adapter.py       # NEW — HybridLLMAdapter (pure composition)
└── __init__.py             # Modified — adds "hybrid" factory case
```

**`OpenAILLMAdapter`** mirrors the `AnthropicLLMAdapter` shape:

- Constructor: `__init__(self, api_key, model, classify_model, nano_model, taxonomy)`
- Uses `openai.AsyncOpenAI` as its SDK client
- Reuses prompt strings (`SYSTEM_PROMPT`, `TAROT_SYSTEM_PROMPT`, `SUMMARIZE_REVIEWS_SYSTEM_PROMPT`) imported from `anthropic_adapter` — same prompt text works across providers
- Reuses taxonomy validation / vocab normalization / mode inference logic by calling shared helpers extracted from `anthropic_adapter.py` where feasible; otherwise duplicates the minimum necessary logic

**`HybridLLMAdapter`** — ~40 lines of pure composition:

```python
class HybridLLMAdapter:
    def __init__(self, anthropic: AnthropicLLMAdapter, openai: OpenAILLMAdapter):
        self._anthropic = anthropic
        self._openai = openai

    async def enrich_shop(self, shop): return await self._anthropic.enrich_shop(shop)
    async def extract_menu_data(self, url): return await self._openai.extract_menu_data(url)
    async def classify_photo(self, url): return await self._openai.classify_photo(url)
    async def summarize_reviews(self, texts): return await self._openai.summarize_reviews(texts)
    async def assign_tarot(self, shop): return await self._openai.assign_tarot(shop)
```

### Tool-Use Translation

The main engineering complexity is translating Anthropic `tool_use` forced-choice into OpenAI `function_calling` with `tool_choice`.

| Anthropic pattern                                         | OpenAI equivalent                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `tools=[{name, input_schema}]`                            | `tools=[{type:"function",function:{name,parameters}}]`                                   |
| `tool_choice={"type":"tool","name":"X"}`                  | `tool_choice={"type":"function","function":{"name":"X"}}`                                |
| Response `content[].type == "tool_use"`, `.input` is dict | `choices[0].message.tool_calls[0].function.arguments` is JSON string — `json.loads()` it |
| `{"type":"image","source":{"type":"url","url":...}}`      | `{"type":"image_url","image_url":{"url":...}}`                                           |
| `system="..."` top-level param                            | First message `{"role":"system","content":"..."}`                                        |
| `max_tokens=N`                                            | `max_tokens=N` (still supported; `max_completion_tokens` only for reasoning models)      |

Shared JSON schemas live in `_tool_schemas.py` as plain dicts. Each adapter wraps them in its provider's envelope at call time. This keeps the schema definitions single-sourced and ensures both adapters ask for the same structured output.

### Config

Add to `backend/core/config.py`:

```python
openai_llm_model: str = "gpt-5.4"              # symmetry only; not used by hybrid in Phase 1
openai_llm_classify_model: str = "gpt-5.4-mini"
openai_llm_nano_model: str = "gpt-5.4-nano"
```

Reuses existing `openai_api_key`. Existing `llm_provider` string gains `"hybrid"` as an option. Default stays `"anthropic"` for rollback safety; staging `.env` flips to `hybrid`.

Model ID defaults use the aspirational "GPT-5.4" names from the ticket; actual model IDs are set in staging `.env` once real GA names are confirmed. Defaults are there to make local dev usable without env config.

### Eval Gate (Pre-Merge, Blocking)

Script: `backend/scripts/eval_openai_routing.py`

Picks 20–30 real staging shops (diverse: with menu photos, with check-in reviews, varied categories). For each shop runs both `AnthropicLLMAdapter` and `OpenAILLMAdapter` and diffs outputs.

| Method              | Metric                                  | Hard gate |
| ------------------- | --------------------------------------- | --------- |
| `extract_menu_data` | Item recall vs Sonnet ground-truth      | ≥85%      |
| `classify_photo`    | Category agreement vs Haiku baseline    | ≥90%      |
| `summarize_reviews` | `is_zh_dominant` pass rate              | **≥95%**  |
| `summarize_reviews` | Length within 80–150% of Haiku baseline | advisory  |
| `assign_tarot`      | Title in `TAROT_TITLES` whitelist       | 100%      |

Taxonomy tag overlap isn't a metric here because `enrich_shop` stays on Anthropic — tags are unchanged.

Script emits `docs/evals/2026-04-10-openai-routing-eval.md` with per-shop results. PR is blocked until the artifact exists and all hard gates pass. If a gate fails, fall back options in priority order:

1. Prompt-tune the failing method (likely `summarize_reviews` if zh-TW slips).
2. Route that method back to Anthropic in `HybridLLMAdapter` — one-line fix.
3. Document the failure in the design doc and re-run the eval.

### Testing Classification

- **(a) New e2e journey?** **No** — no new user path, worker pipeline only.
- **(b) 80% coverage gate?** **Yes** — applies to `openai_adapter.py` and `hybrid_adapter.py` (both are critical provider adapters per SPEC §3).

### Rollback

Single env var flip: `LLM_PROVIDER=anthropic` restores the original full-Claude path. No DB migrations, no schema changes, no state to unwind. Rollback is safe at any point post-deploy.

### Risks & Mitigations

| Risk                                                                   | Mitigation                                                                                                                   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| GPT-5.4-mini returns Simplified Chinese on `summarize_reviews`         | Existing `is_zh_dominant` runtime guard in handler will raise cleanly; eval gate ≥95% pass rate catches pre-merge            |
| Menu OCR quality drops on handwritten Taiwanese menus                  | Eval gate tests real menu photos; fallback: route `extract_menu_data` back to Anthropic in hybrid                            |
| GPT-5.4 model IDs not yet GA at implementation time                    | Model IDs are env-var parameterized; code ships with aspirational defaults, staging `.env` sets real IDs                     |
| OpenAI function-calling JSON parse failures (arguments not valid JSON) | Explicit test cases for parse failure paths; adapter raises `RuntimeError` with context so queue retry/fail logic handles it |
| Regression in `enrich_shop` (should be zero — unchanged code path)     | Existing `test_anthropic_adapter.py` suite still runs; `HybridLLMAdapter` delegates identically                              |
| Tool-schema refactor breaks anthropic                                  | Step 4 is a regression check — existing anthropic tests must stay green                                                      |

### Open Questions

- **Actual GPT-5.4 model IDs** — resolved at staging-env time, not at plan/implementation time.
- **Menu OCR quality on handwritten menus** — resolved by eval run; if failing, routing flips back for that method.
