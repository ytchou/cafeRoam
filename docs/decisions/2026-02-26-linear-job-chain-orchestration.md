# ADR: Linear Job Chain Orchestration

Date: 2026-02-26

## Decision

Pipeline steps are orchestrated via linear job chaining — each handler queues the next step on success.

## Context

The data pipeline has 4 sequential steps: scrape → enrich → embed → publish. We needed to choose how to orchestrate this multi-step flow within the existing Postgres job queue.

## Alternatives Considered

- **Shop state machine**: Each shop has a `processing_status` column, and a single poll loop checks for shops in each state. Rejected: mixes business data with operational state, retry logic becomes complex per-stage, and creates a parallel system alongside the job queue.
- **Pipeline DAG with job groups**: Define pipelines as directed acyclic graphs with dependency resolution. Rejected: significantly over-engineered for a linear 4-step pipeline at V1 scale. Can evolve toward this incrementally if parallel steps are needed later.

## Rationale

Linear job chaining is the simplest approach that reuses the existing `JobQueue` infrastructure. Each handler is self-contained, retries independently (a failed enrichment doesn't re-run scraping), and the existing `FOR UPDATE SKIP LOCKED` claiming works unchanged. A `processing_status` column on the shops table provides pipeline visibility without driving the orchestration.

## Consequences

- Advantage: Minimal new code. Individual step retries. Easy to understand and debug.
- Advantage: Adding a step is just adding a new handler + updating the previous handler to queue it.
- Disadvantage: No global "pipeline run" view without joining across job records. Mitigated by the `processing_status` read model on shops.
- Disadvantage: Harder to add parallel steps (e.g., enrich + extract menu simultaneously). Acceptable trade-off for V1.
