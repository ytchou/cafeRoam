# ADR: Defer Anthropic Batch API to a follow-up ticket

Date: 2026-04-10

## Decision

Split DEV-304 into two phases. Phase 1 (this ticket) ships the OpenAI adapter + hybrid routing only. Anthropic Batch API integration for `enrich_shop` is deferred to a follow-up ticket to be filed after Phase 1 is merged and cost savings are validated.

## Context

DEV-304 originally bundled three pieces of work: (1) an OpenAI provider adapter, (2) per-method model routing, and (3) switching `enrich_shop` from on-demand Anthropic calls to the Anthropic Batch API (50% discount, async with up to 24h turnaround). The ticket's headline "~8x cost reduction" depends primarily on piece 2 — model downgrade for the four non-critical methods. Piece 3 adds an additional ~50% savings on the `enrich_shop` leg but at the cost of a significant architecture change to the enrichment pipeline.

The Batch API is not a drop-in replacement. Switching `enrich_shop` to batch mode requires:

1. New job types (`ENRICH_SHOP_BATCH_SUBMIT`, `ENRICH_SHOP_BATCH_POLL`) with distinct handler logic.
2. An async polling loop that waits for batch completion (Anthropic documents up to 24h turnaround).
3. Queue state machine changes to handle "waiting on batch" as a first-class status, distinct from the current retry/backoff model.
4. Careful placement of the batch enqueue to avoid regressing the pipeline-gap incident documented in ERROR-PREVENTION 2026-04-07 ("shops without photos bypass enrichment when enqueue point moves"). The lesson from that incident is that any conditional path added to the enrichment queue needs an unconditional fallback — batch mode introduces exactly that kind of conditional path.

## Alternatives Considered

- **Ship everything in one ticket**: Captures the full cost reduction immediately. Rejected because the PR would touch the provider layer, config, factory, worker handlers, queue state machine, and scheduler simultaneously. The regression surface is large and the most dangerous single risk (pipeline gap) sits on the batch mechanism. A regression here would silently drop shops from enrichment during Beta Launch seeding.
- **Ship Batch API first, OpenAI adapter later**: Captures ~2x savings only (batch discount), missing the bigger lever (model downgrade for `extract_menu_data` is 7.5x cheaper). Delays the cost relief that actually matters for Beta Launch economics.
- **Ship OpenAI adapter + routing first, defer Batch API (chosen)**: Captures ~80% of the cost savings with a much smaller regression surface. The PR touches only the provider layer, factory, and config — zero changes to queue, scheduler, or worker handlers. Rollback is a single env var flip.

## Rationale

The cost savings curve is heavily front-loaded: model downgrade captures the majority of the savings, Batch API is incremental on top. Shipping them sequentially lets us:

1. Validate the model downgrade on real staging data via the eval gate before touching the queue state machine.
2. Observe actual cost numbers post-merge, so the Batch API ticket can be scoped against real baseline rather than projected savings.
3. Isolate risk — if the Batch API integration regresses the pipeline in Phase 2, rollback doesn't lose the Phase 1 cost wins.
4. Keep each PR small enough to review carefully, which is especially important for queue state machine changes where bugs compound.

## Consequences

- **Advantage**: Phase 1 regression surface is minimal (provider layer only, no queue changes). Pipeline-gap risk from ERROR-PREVENTION 2026-04-07 is zero for this ticket.
- **Advantage**: Cost savings land sooner — no waiting on batch polling infrastructure before unblocking Beta Launch seeding economics.
- **Advantage**: Phase 2 scope is informed by Phase 1 production data, so the Batch API ticket can set concrete thresholds (e.g. "batch if queue depth > N") instead of designing blind.
- **Disadvantage**: `enrich_shop` stays on full-price Sonnet until Phase 2 ships; we leave ~50% savings on that leg unclaimed temporarily.
- **Disadvantage**: Two tickets, two eval passes, two PRs — slightly more total engineering time than one bundled change, though lower risk per PR.
- **Disadvantage**: Must remember to file the follow-up ticket. Mitigated by a "Follow-up Ticket" section in DEV-304's description and a comment in the brainstorm decision log.
