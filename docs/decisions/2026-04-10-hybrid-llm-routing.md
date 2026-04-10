# ADR: Hybrid LLM routing via composition, not whole-provider swap

Date: 2026-04-10

## Decision

Introduce a `HybridLLMAdapter` that composes `AnthropicLLMAdapter` and `OpenAILLMAdapter` and dispatches each of the five `LLMProvider` protocol methods to the provider that offers the best cost/quality trade-off for that method. `enrich_shop` stays on Claude Sonnet 4.6; the other four methods (`extract_menu_data`, `classify_photo`, `summarize_reviews`, `assign_tarot`) route to OpenAI.

## Context

Per-shop enrichment cost is the dominant variable in the Beta Launch seeding budget. Claude Sonnet 4.6 is expensive for vision OCR and trivial classification tasks, but ADR 2026-02-24 established that Sonnet is required for `enrich_shop` because Haiku only hit 63% tag overlap — below the quality floor for taxonomy assignment, which is load-bearing for search relevance.

The existing factory does a whole-provider swap based on `settings.llm_provider`. That design can't express the per-method routing we need: we can't say "Sonnet for one method, GPT-5.4-mini for four others" without either changing the protocol, introducing a routing map, or composing adapters.

## Alternatives Considered

- **Whole-provider swap via `LLM_PROVIDER=openai`**: Simplest, but forces all five methods onto OpenAI. Rejected because it breaks the Sonnet-for-`enrich_shop` quality gate from ADR 2026-02-24.
- **Env-var routing map (`LLM_ROUTING_MAP=enrich_shop=anthropic,...`)**: Brittle string parsing at module load time, no type safety, hard to test edge cases (missing keys, typos). Rejected as fragile.
- **Protocol-level routing metadata (decorators on each method specifying a provider)**: Couples the protocol to routing logic. Rejected — the `LLMProvider` protocol should describe capabilities, not deployment choices.
- **Hybrid adapter composition (chosen)**: One adapter per provider, a third adapter that wraps both and delegates per method. Routing logic is a single file with one line per method; trivial to test; no changes to the protocol or handlers.

## Rationale

The composition approach keeps the `LLMProvider` protocol untouched, so handlers, scheduler, and queue all stay provider-agnostic. Routing decisions become source code, not config — which means they're type-checked, grep-able, and reviewed in PRs rather than set at runtime. The hybrid adapter is ~40 lines of boilerplate with zero logic, so the only real complexity lives in the two underlying adapters, which is where it belongs.

This also preserves the rollback path: `LLM_PROVIDER=anthropic` reverts instantly to the original Anthropic-only path with no code changes, since the `"anthropic"` factory case is untouched. Deployments can flip providers without redeploys.

## Consequences

- **Advantage**: Per-method provider choice is explicit and type-safe; no runtime config parsing; handlers and protocol unaffected; rollback is a single env var.
- **Advantage**: Future providers (e.g. Gemini for a specific method) plug in cleanly — add an adapter, add a delegation line in `HybridLLMAdapter`.
- **Disadvantage**: Two API clients are instantiated on every worker process even if only one is routed to for most calls; marginal memory overhead.
- **Disadvantage**: Cost monitoring has to track two provider bills instead of one; reconciliation work for the operator during Beta Launch.
- **Disadvantage**: If the eval gate fails for a particular method, the fix is a one-line edit in `HybridLLMAdapter` — which is cheap, but means the routing config lives in code and any change is a PR, not a dashboard toggle.
