# ADR: Asymmetric cost computation — LLM at log time, Apify at query time

Date: 2026-04-12

## Decision

LLM (Anthropic, OpenAI) cost is computed at log time and stored as `cost_usd`.
Apify cost is computed at query time: `compute_units * settings.apify_cost_per_cu`.

## Context

DEV-317 api_usage_log stores provider call data. Two providers use fundamentally
different billing models: tokens (LLM) vs compute units (Apify).

## Alternatives Considered

- **All providers at log time**: Compute and store `cost_usd` for Apify too. Rejected:
  if Apify pricing changes, historical rows show incorrect costs and cannot be recalculated.
- **All providers at query time**: Store raw usage everywhere. Rejected: LLM pricing is
  model-version-stable; computing at log time is simpler with no config dependency at read time.

## Rationale

LLM pricing is tied to the model string (immutable once logged). Apify pricing is a
business rate that may change. Raw `compute_units` + configurable rate allows operators to
update `APIFY_COST_PER_CU` and immediately see corrected MTD figures.

## Consequences

- Advantage: Apify pricing changes reflected retroactively
- Advantage: LLM historical costs are exact and independent of current config
- Disadvantage: endpoint must branch on provider when computing totals
