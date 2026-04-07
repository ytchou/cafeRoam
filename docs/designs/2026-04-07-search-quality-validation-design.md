# Design: DEV-265 — Search Quality Validation Gate

**Date:** 2026-04-07
**Ticket:** [DEV-265](https://linear.app/ytchou/issue/DEV-265)
**Status:** Approved

## Context

This is the FATAL assumption gate from ASSUMPTIONS.md. If semantic search doesn't produce a "wow" moment vs Google Maps, nothing else matters. CafeRoam is 6+ weeks in without validating this core assumption. This design extends the existing eval infrastructure to run a rigorous side-by-side comparison.

## Architecture

Extend `backend/scripts/run_search_eval.py` with a `--validate` mode that produces a comprehensive quality report comparing CafeRoam semantic search against Google Maps.

**Components:**

1. **Data pipeline** (existing) — scrape → enrich → embed shops to staging
2. **Query set** — expand `search-queries.json` from 10 → 20 queries
3. **CafeRoam eval** (existing + extended) — LLM-as-judge scoring with NDCG@5, MRR
4. **Maps baseline** (new, manual) — human-scored Google Maps results in `google-maps-baseline.json`
5. **Report generator** (new) — produces `docs/validation/search-quality-report.md`

## Data Flow

```
1. [Human] Run 20 queries on Google Maps → record in google-maps-baseline.json
2. [Script] Check staging shop count → if <50, warn and exit
3. [Script --validate] For each of 20 queries:
   a. Embed query → search pgvector → get top 5 CafeRoam results
   b. LLM-judge scores CafeRoam results (0-2 per result)
   c. Load Google Maps baseline scores for same query
   d. Normalize CafeRoam 0-2 scores to 1-5 scale for fair comparison
   e. Compare: CafeRoam normalized avg vs Maps avg → "better" / "same" / "worse"
4. [Script] Compute aggregate: X/20 queries where CafeRoam >= Maps
5. [Script] Generate markdown report with PASS (>=7) or FAIL (<7) verdict
```

## New Files

- `backend/scripts/google-maps-baseline.json` — manually created, schema: `[{id, query, category, maps_results: [{rank, name, relevance_score, notes}], maps_avg_score}]`
- `docs/validation/search-quality-report.md` — generated output
- `docs/validation/MAPS_REVIEW_INSTRUCTIONS.md` — instructions for manual Maps review

## Modified Files

- `backend/scripts/run_search_eval.py` — add `--validate` flag, Maps comparison logic, markdown report generator
- `backend/scripts/search-queries.json` — expand from 10 → 20 queries

## Query Expansion (10 new queries)

Current 10 cover: attribute, vibe, mode, specific, mixed. New queries fill gaps:

- Mode-based: "安靜適合工作的咖啡廳", "適合約會的咖啡廳", "適合帶筆電工作一整天的咖啡廳"
- Attribute-based: "有插座不限時", "寵物友善", "有戶外座位的咖啡廳"
- Menu/Specific: "有巴斯克蛋糕的咖啡廳", "手沖咖啡推薦"
- Location-mixed: "中山站附近安靜咖啡廳", "quiet cafe with outlets near Zhongshan"

## Score Normalization

CafeRoam uses LLM-judge scores (0-2 integer). Maps uses human scores (1-5). To compare:

- 0 → 1 (irrelevant)
- 1 → 3 (moderate match)
- 2 → 5 (perfect match)
- Formula: `normalized = score * 2 + 1`

Winner determination: CafeRoam wins if normalized avg > Maps avg + 0.5 (margin to avoid noise).

## Pass/Fail Gate

- **Threshold:** ≥7/20 queries where CafeRoam is better than or equal to Google Maps
- **PASS:** Unblock DEV-266, DEV-267, DEV-268, DEV-272
- **FAIL:** Stop all other work, fix enrichment quality first

## Error Handling

- If staging has <50 enriched shops → script prints warning, exits non-zero
- If `google-maps-baseline.json` is missing → clear error with schema example
- If any query returns 0 results → flagged as "NO RESULTS" (counts as a loss)

## Alternatives Rejected

- **Automated Google Maps scraping** — fragile (anti-bot), adds engineering scope to a validation ticket
- **Standalone validation script** — duplicates existing eval infrastructure for no benefit
- **CI gate** — overkill for a one-time validation; markdown report is sufficient

## Testing Classification

- [ ] **New e2e journey?** No — one-time validation script, not user-facing
- [x] **Coverage gate impact?** No — script changes only, doesn't touch critical-path services
