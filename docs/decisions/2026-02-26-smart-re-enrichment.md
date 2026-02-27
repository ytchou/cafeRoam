# ADR: Smart Re-enrichment Over Fixed 90-Day Cycle

Date: 2026-02-26

## Decision

Re-enrichment is triggered only when new Google reviews are detected, users report stale info, or check-in data reveals discrepancies — not on a fixed schedule.

## Context

The SPEC originally described a 90-day staleness sweep that re-enriches all shops older than 90 days. With 200+ shops, this would re-enrich 2-3 shops/day at ~$0.62/shop (Claude Sonnet), costing $40-60/month regardless of whether anything changed.

## Alternatives Considered

- **Fixed 90-day cycle**: Re-enrich every shop every 90 days regardless. Rejected: burns cost on shops that haven't changed. Many independent coffee shops don't change significantly in 90 days.
- **Manual only**: No automated re-enrichment; admin triggers manually. Rejected: doesn't scale and risks stale data going unnoticed.

## Rationale

Smart re-enrichment checks for actual changes (new Google reviews, user reports) before spending API budget. The daily staleness sweep still runs, but performs a lightweight review-date check via Apify before deciding whether to queue a full re-enrichment. Estimated to save ~60% of enrichment costs compared to the fixed cycle.

## Consequences

- Advantage: Significant cost savings ($7-23/month vs $40-60/month).
- Advantage: Enrichment budget is spent on shops that actually changed.
- Disadvantage: Slightly more complex staleness sweep (needs to compare review dates, not just check age).
- Disadvantage: If a shop changes in ways not reflected in reviews (e.g., renovation, new owner), it won't be caught automatically. Mitigated by user-reported stale info path.
