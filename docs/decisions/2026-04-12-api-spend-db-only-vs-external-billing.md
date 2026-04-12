# ADR: DB-only cost tracking vs external billing API fan-out

Date: 2026-04-12

## Decision

Instrument provider adapters to write to a local `api_usage_log` table. Do NOT call
external billing APIs (Anthropic `/v1/usage`, OpenAI `/dashboard/billing/usage`,
Apify `/v2/users/me/usage/monthly`).

## Context

DEV-317 requires a daily API spend view for operators before beta launch.

## Alternatives Considered

- **External billing API fan-out**: Each provider exposes a billing/usage endpoint.
  Rejected: (1) requires separate billing-read API key scopes per provider;
  (2) adds external rate-limit and auth surface that can break cost visibility
  independently of enrichment; (3) task-level breakdown unavailable from any
  provider billing API.
- **Hybrid (external for provider totals, DB for task breakdown)**: Requires
  reconciling two data sources with different time granularities. Rejected: marginal
  accuracy benefit does not justify the complexity.

## Rationale

DB-only gives richer task-level data, no external auth dependencies, and a single
query path. The only risk is missed instrumentation points — mitigated by comprehensive
adapter coverage in this PR.

## Consequences

- Advantage: task-level cost breakdown from day one
- Advantage: no external billing API auth to manage
- Disadvantage: new provider call sites added without instrumentation create invisible costs
