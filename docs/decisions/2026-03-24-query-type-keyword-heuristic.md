# ADR: Keyword heuristic for query_type classification

Date: 2026-03-24

## Decision

Classify search queries into `item_specific`, `specialty_coffee`, or `generic` using compiled regex keyword matching, not LLM or embedding-based classification.

## Context

The spec requires server-side `query_type` classification on every search request. This value is used in PostHog analytics and the `search_events` table to understand what users search for. Classification runs on every search, so it must be fast and cost-effective.

## Alternatives Considered

- **LLM classification (Claude)**: Most accurate, handles nuance and novel terms. Rejected: adds ~500ms latency and per-request API cost on every search. The three categories are simple enough that a keyword list achieves sufficient accuracy. Overkill for v1.
- **Embedding similarity**: Pre-embed category descriptions, compare with query embedding (already computed for search). Rejected: adds classification complexity without meaningful accuracy improvement over keywords for just three categories. Query embedding is already used for shop matching — reusing it for classification conflates two concerns.

## Rationale

Three categories with clear keyword boundaries (food terms, coffee method terms, everything else) are well-suited to regex matching. Keyword lists can be extended over time using search log data — the observability feature itself provides the feedback loop. Zero latency, zero cost, deterministic results.

## Consequences

- Advantage: Zero latency and zero cost per classification
- Advantage: Deterministic — same query always gets same type
- Advantage: Keyword lists can be tuned using search_events data (self-improving)
- Disadvantage: Won't catch novel terms or misspellings (acceptable for analytics — a few misclassifications don't break anything)
- Disadvantage: Needs manual keyword list maintenance (mitigated by the data feedback loop)
