# ADR: Feature caps over credit-based gating for user tiers

Date: 2026-03-25

## Decision

Use simple feature caps (e.g., 5 AI searches/day, 3 lists max) instead of a credit/token system for differentiating free and paid user tiers.

## Context

When designing the free-to-paid user tier boundary, two gating models were considered: a shared credit pool (each action costs credits) vs. per-feature hard caps. The key product constraint is that AI semantic search is the primary moat and conversion driver — the gating model must let free users experience the "wow" moment while creating upgrade motivation.

## Alternatives Considered

- **Credit-based system**: A shared pool (e.g., 30 credits/month) where each action costs credits. Rejected: harder to communicate to users ("how many credits does X cost?"), requires building a credit tracking system, and adds cognitive load. The flexibility is not worth the complexity at this stage.
- **Time-limited full access**: Free tier gets full access for X days/month, then locks to browse-only. Rejected: too aggressive. Users who only need the app occasionally would churn immediately.
- **Search-based credits only**: Credits that only apply to search, not other features. Rejected: functionally identical to a search cap but with extra abstraction overhead.

## Rationale

Feature caps are the simplest model that achieves the goal:
- **Easy to communicate**: "5 AI searches per day" is instantly understood.
- **Easy to implement**: A counter per user per day/feature. No credit ledger, no transaction tracking.
- **Easy to tune**: Adjust the cap number without changing the model.
- **Proven pattern**: Spotify, LinkedIn, and most freemium consumer apps use feature caps, not credits.

## Consequences

- **Advantage**: Minimal engineering effort. Simple UX. Easy to explain in marketing.
- **Advantage**: Each cap can be tuned independently (search cap, list cap, feed cap).
- **Disadvantage**: Less flexible than credits — can't do "use your budget however you want." Acceptable tradeoff at current scale.
- **Disadvantage**: Multiple caps across features could feel nickel-and-dime. Mitigated by keeping the number of capped features small (search + lists + feed only).
