# ADR: Inject Taxonomy via Constructor Rather Than DB Query

Date: 2026-02-26

## Decision

The LLM provider adapter receives its taxonomy as a constructor parameter rather than querying the database at call time or loading from a static file.

## Context

The Anthropic LLM adapter needs the full taxonomy (83 tags across 5 dimensions) to build enrichment prompts. The taxonomy must be included in every `enrich_shop` call so Claude can select from the predefined tag list. Three approaches were considered for how the adapter obtains this data.

## Alternatives Considered

- **Load from DB at call time**: Query the taxonomy table on each `enrich_shop` invocation. Rejected: adds a database dependency to the provider layer, which violates the principle that providers are pure external-service wrappers. Also adds latency per call.
- **Embed as a static file**: Bundle `taxonomy.json` in the backend package. Rejected: requires redeployment to update tags. When the canonical tag table exists in the DB, the static file would drift.

## Rationale

Constructor injection keeps the adapter pure — it has no knowledge of databases or filesystems. The caller (worker handler or factory) loads taxonomy from whatever source is appropriate (DB table, file, hardcoded list for tests). This aligns with the project's provider abstraction principle: adapters only know about their external service (Anthropic API), not about internal infrastructure.

## Consequences

- Advantage: Adapter is fully testable with no mocks beyond the Anthropic client
- Advantage: Taxonomy source can change (file to DB) without touching the adapter
- Disadvantage: Factory or caller must explicitly load and pass taxonomy, adding a step to the wiring
