# ADR: Admin review gate for community shop submissions

Date: 2026-03-26

## Decision

User-submitted shops require admin approval before going live. After the enrichment pipeline completes, submissions land in `pending_review` status instead of `live`.

## Context

DEV-38 adds community shop submissions. The existing pipeline processes submissions immediately (scrape → enrich → embed). The question was whether to auto-publish enriched shops or require manual review.

## Alternatives Considered

- **Auto-publish (no gate)**: Pipeline goes straight to `live`. Trust the geo-gate and enrichment to filter bad data. Rejected: no protection against spam, non-café businesses, or low-quality entries polluting the directory. Quality of the directory is a core differentiator.
- **Auto-publish with flagging**: Shops go live immediately but suspicious ones get flagged for review. Rejected: harder to implement correctly (what triggers a flag?) and still allows bad data to be visible to users temporarily.

## Rationale

Directory quality is a core differentiator for CafeRoam — every shop should meet a baseline standard. At the current scale (164 shops, low submission volume expected), manual review is trivially cheap. The admin review page on the existing `/admin` section keeps the workflow simple. The `pending_review` status already exists in the `ProcessingStatus` enum.

## Consequences

- Advantage: Full quality control over directory content
- Advantage: Natural spam prevention without complex heuristics
- Disadvantage: Submissions have a latency between enrichment and going live (depends on admin review cadence)
- Disadvantage: Doesn't scale if submission volume grows significantly — will need automated quality scoring or community moderation later
