# ADR: Use Claude Sonnet for Shop Enrichment (Not Haiku)

**Date:** 2026-02-24
**Status:** Decided
**Deciders:** ytchou

---

## Context

The shop enrichment pipeline (pass3b) calls Claude to classify each shop against the taxonomy and produce a summary + top reviews. Two model options were evaluated:

- **Claude Haiku 4.5** — ~3.75× cheaper, faster
- **Claude Sonnet 4.6** — higher quality, used during pre-build validation

With 29 shops enriched by Sonnet and the same 29 re-enriched by Haiku, a tag-level comparison was run.

---

## Results

| Metric           | Value        |
| ---------------- | ------------ |
| Tag overlap rate | 63.3%        |
| Sonnet-only tags | 5.9/shop avg |
| Haiku-only tags  | 3.2/shop avg |

**Tags Haiku consistently missed:**

- Nuanced vibe: `wenqing`, `healing_therapeutic`, `community_vibe`, `hidden_gem`
- Critical factual: `bookstore_cafe` for 青鳥 (a well-known Taipei bookstore café — hard miss)
- Verified attributes: `has_cats`/`store_cat` for confirmed cat shops
- Specialty coffee: `roastery_onsite`, `espresso_focused`
- Mode/intent: `solo_time`, `catch_up_friends`, `slow_morning`, `coffee_tasting`

**Tags Haiku hallucinated:**

- `has_cats` for 未央咖啡店 (not a cat shop)
- `no_time_limit` on shops where Sonnet didn't assign it

The 63.3% overlap rate is below the 80% threshold for a safe model swap. The specific misses directly degrade search quality — these were the same tags that drove the pre-build search quality improvements (10/10 queries passing).

---

## Decision

**Use Claude Sonnet 4.6 for shop enrichment.**

---

## Cost Rationale

Enrichment is a **write-time cost, not a query-time cost**. Sonnet only runs when a shop is added or re-enriched — not on user searches. Cost is bounded by catalog size and update frequency:

| Shops | Sonnet (one-time) | Haiku (one-time) | Delta  |
| ----- | ----------------- | ---------------- | ------ |
| 100   | ~$1.80            | ~$0.48           | $1.32  |
| 500   | ~$9.00            | ~$2.40           | $6.60  |
| 1,000 | ~$18.00           | ~$4.80           | $13.20 |

_(Estimated at ~3,000 input / 600 output tokens per shop)_

At current scale, the cost delta does not justify the quality loss.

---

## Where Haiku Is Appropriate

- **Factual attribute extraction** — pulling structured data (hours, price range, seating) from scraped pages
- **Incremental new-tag classification** — when 1-2 tags are added to the taxonomy, Haiku can handle the delta pass at lower stakes
- **Summary-only regeneration** — if we ever decouple summary generation from tag classification

---

## When to Revisit

Reconsider if:

- Catalog exceeds **5,000 shops** and re-enrichment cost becomes a budget line item
- Incremental tag classification is built (reduces re-enrichment surface significantly)
- Haiku model quality improves in a future release and overlap rate exceeds 80%

---

## Consequences

1. Pass3b uses `claude-sonnet-4-6` as the default model
2. Incremental tag classification should be built before catalog exceeds 500 shops
3. Re-enrichment strategy needs a staleness policy to control ongoing costs
