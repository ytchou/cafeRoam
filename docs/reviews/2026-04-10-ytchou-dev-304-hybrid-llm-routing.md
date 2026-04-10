# Code Review Log: ytchou/dev-304-hybrid-llm-routing

**Date:** 2026-04-10
**Branch:** ytchou/dev-304-hybrid-llm-routing
**Mode:** Pre-PR
**HEAD SHA:** 5e357715f2b2594e53f1db013a02d78b8e2f0dbc

## Pass 1 — Full Discovery

*Agents executed inline by Opus: Bug Hunter, Standards, Architecture, Plan Alignment, Test Philosophy. Adversarial Review (Codex) skill unavailable in this environment — skipped.*

### Issues Found (9 total)

| Severity  | File:Line                                              | Description                                                                                                                                                                       | Flagged By           |
|-----------|--------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| Important | backend/providers/llm/__init__.py:7-38                 | `.env.example` documents `LLM_PROVIDER=openai` as a valid option but the factory match statement has no `"openai"` case — setting it would raise `Unknown LLM provider: openai`. | Bug Hunter, Standards |
| Important | backend/tests/providers/test_openai_adapter.py:135-147 | Mock returns `items[].item_name` but `EXTRACT_MENU_SCHEMA` declares the required key as `name`. Test locks an incorrect shape that silently diverges from the live schema.        | Test Philosophy      |
| Important | backend/providers/llm/openai_adapter.py:203-207        | `classify_photo` prompt omits the "If both MENU and VIBE apply, choose MENU" disambiguation that the Anthropic adapter uses. Systematic disagreement will depress the eval gate's classify_photo_agreement metric by construction. | Architecture         |
| Important | backend/scripts/eval_openai_routing.py:89-162          | N+1 DB queries: `--auto` path fetches the full shop rows into `rows` then the loop re-queries each shop one-by-one with `.eq("id", sid).limit(1)`. Violates CLAUDE.md "No N+1 queries" performance rule. | Architecture         |
| Minor     | backend/providers/llm/openai_adapter.py:62-69, 154     | `_build_enrich_messages` declares unused parameters `menu_vocab_ref` / `specialty_vocab_ref` (call site passes `""`) and imports `_MENU_VOCAB_REF` / `_SPECIALTY_VOCAB_REF` from inside the function body on every invocation. Hoist import to module scope and drop dead params. | Standards            |
| Minor     | backend/providers/llm/openai_adapter.py:233            | `assign_tarot` performs `from core.tarot_vocabulary import ...` inside the function body — should be a module-level import (CLAUDE.md "No work in loops" / hoisting rule).       | Standards            |
| Minor     | backend/providers/llm/openai_adapter.py:96-106         | `_build_enrich_messages` is missing the vocabulary "Instruction" block present in `anthropic_adapter._build_enrich_prompt` (lines 353-360). Currently latent because hybrid routes `enrich_shop` to Anthropic, but any future `LLM_PROVIDER=openai` path (which `.env.example` already documents) will silently produce degraded zh-TW normalization. | Architecture         |
| Minor     | backend/providers/llm/openai_adapter.py:160, 189       | Uses `max_completion_tokens` unconditionally. Design doc §Tool-Use Translation explicitly notes `max_completion_tokens` is reasoning-model-only. Non-reasoning GPT models may need `max_tokens`. Worth a code comment or runtime model-check.                                      | Architecture         |
| Minor     | backend/models/types.py:400                            | `socket: str \| bool \| None` — type broadened from `str \| None` with no matching test and no mention in the plan doc. Scope creep unless justified by observed staging data.  | Plan Alignment       |

### Validation Results

All 9 findings validated as **valid** after file-grouped re-read. Details:

- **Factory openai-case gap** — verified in `__init__.py` (only `anthropic` and `hybrid` cases; default raises). `.env.example:2` explicitly lists `openai` as an option.
- **Test schema mismatch** — the mock uses `item_name`; the schema (`_tool_schemas.py:80-87`) requires `name`. The adapter returns `payload.get("items", [])` raw, so the test passes but locks in an incorrect contract.
- **classify_photo prompt drift** — `anthropic_adapter.py:251` vs `openai_adapter.py:203`, verified via direct read.
- **N+1 in eval script** — lines 89-98 fetch all rows already, 121-133 re-fetch each shop individually. Rows contain the same `shop_fields`, so the loop refetch is pure waste.
- **Dead params / local imports** — verified by reading `openai_adapter.py:62, 69, 154, 233`.
- **Missing instruction block** — confirmed by comparing `_build_enrich_messages` (openai_adapter.py:62-133) with `_build_enrich_prompt` (anthropic_adapter.py:313-371).
- **max_completion_tokens usage** — noted in design doc row 12 of Tool-Use Translation table.
- **socket type change** — unrelated to routing; possibly justified by scraper data but not plan-documented.

### Skipped (false positives)

- `HybridLLMAdapter` TYPE_CHECKING import pattern — legitimate since `from __future__ import annotations` is set; no runtime cost.
- `test_llm_factory_returns_anthropic` missing model assertions — pre-existing test style not touched by this PR.
- `summarize_reviews` 0-indexed vs 1-indexed enumeration difference — cosmetic, both produce 1-indexed output.
- Test async decorator marks — `asyncio_mode=auto` configured in backend pyproject.toml, not a real issue.

---

## Fix Pass 1

**Pre-fix SHA:** 5e357715f2b2594e53f1db013a02d78b8e2f0dbc

**Issues fixed:**
- [Important] backend/providers/llm/__init__.py:17-26 — Added missing `'openai'` case to get_llm_provider factory; `LLM_PROVIDER=openai` now returns a standalone `OpenAILLMAdapter`
- [Important] backend/tests/providers/test_openai_adapter.py:135-147 — Fixed mock to use schema key `name` (not `item_name`) and updated assertion; aligns test with `EXTRACT_MENU_SCHEMA`
- [Important] backend/providers/llm/openai_adapter.py:215-219 — Added "If both MENU and VIBE apply, choose MENU" tie-breaker to `classify_photo` prompt; now matches `anthropic_adapter` verbatim
- [Important] backend/scripts/eval_openai_routing.py:89-162 — Eliminated N+1 query in `--auto` path: bulk-fetched rows stored in `prefetched_rows` dict; per-shop re-query only for explicit `--shops` IDs not already in memory
- [Minor] backend/providers/llm/openai_adapter.py:62-69,154 — Removed dead `menu_vocab_ref`/`specialty_vocab_ref` params; hoisted `_MENU_VOCAB_REF`/`_SPECIALTY_VOCAB_REF` to module scope
- [Minor] backend/providers/llm/openai_adapter.py:233 — Moved tarot vocabulary import to module-level
- [Minor] backend/providers/llm/openai_adapter.py:96-106 — Added vocabulary normalization Instruction block matching `anthropic_adapter`
- [Minor] backend/providers/llm/openai_adapter.py:160 — Added clarifying comment on `max_completion_tokens` usage and model-capability caveat
- [Minor] backend/models/types.py:400 — Added inline comment documenting `socket` type widening rationale

**Commits:**
- `a544106` — Fix factory openai case, test schema key (item_name→name), classify_photo tie-breaker prompt, N+1 query in eval script --auto branch
- `112ee62` — Drop dead _build_enrich_messages params, hoist tarot imports to module scope, add vocab normalization instruction block, add max_completion_tokens comment, document socket type widening

**Batch Test Run:**
- `pnpm test` — PASS (1232 tests, 225 files)
- `cd backend && uv run pytest` — PASS (935 tests, 27 warnings)

---

## Pass 2 — Re-Verify

*Agents re-run: Bug Hunter, Standards & Conventions, Architecture & Design, Plan Alignment, Test Philosophy*
*Agents skipped (no findings): none*
*Agents skipped (Minor-only): none*

### Previously Flagged Issues — Resolution Status

- [Important] backend/providers/llm/__init__.py:7-38 — ✓ Resolved
- [Important] backend/tests/providers/test_openai_adapter.py:135-147 — ✓ Resolved
- [Important] backend/providers/llm/openai_adapter.py:203-207 — ✓ Resolved
- [Important] backend/scripts/eval_openai_routing.py:89-162 — ✓ Resolved
- [Minor] backend/providers/llm/openai_adapter.py:62-69,154 — ✓ Resolved
- [Minor] backend/providers/llm/openai_adapter.py:233 — ✓ Resolved
- [Minor] backend/providers/llm/openai_adapter.py:96-106 — ✓ Resolved
- [Minor] backend/providers/llm/openai_adapter.py:160,189 — ✓ Resolved
- [Minor] backend/models/types.py:400 — ✓ Resolved

### New Issues Found (0)

No new issues introduced by the fix diff.

---

## Final State

**Iterations completed:** 1
**All Critical/Important resolved:** Yes
**Remaining issues:** None

**Review log:** docs/reviews/2026-04-10-ytchou-dev-304-hybrid-llm-routing.md
