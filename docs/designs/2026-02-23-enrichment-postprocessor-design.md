# Enrichment Post-Processor Design (Pass 3c)

**Date:** 2026-02-23
**Status:** Approved
**Spec References:** SPEC.md §9 (taxonomy is canonical), PRD.md §5 (4 modes: work/rest/social/coffee)

## Problem

Pass 3b produces over-tagged data (avg 20 tags/shop out of 79) with no differentiation signal. Tags like `cozy` (86% of shops) and `community_vibe` (83%) are noise when used for filtering or search boost. Additionally, `mode` is a single string that never assigns `work` (0/29 shops) and uses `mixed` as a catch-all.

## Solution

A new `pass3c-postprocess.ts` that reads `pass3-enriched.json`, computes per-tag distinctiveness scores (IDF-based), infers multi-mode from existing tags, and writes `pass3c-processed.json`. No re-enrichment needed — this is a pure post-processing step.

## Design

### 1. Tag Distinctiveness (IDF-based)

For each tag across all shops:

```
idf(tag) = log(N / df(tag))
```

Where `N` = total shops, `df(tag)` = number of shops with that tag.

Each shop's tag gets a combined score:

```
distinctiveness = confidence × idf(tag)
```

Tags are kept but sorted by distinctiveness descending. High-IDF tags differentiate; low-IDF tags are still available but ranked lower. Search/filter layers decide what to surface.

Example with 29 shops:

- `cozy` in 25/29 → IDF = 0.15 → low distinctiveness
- `roastery_onsite` in 8/29 → IDF = 1.29 → high distinctiveness
- `store_cat` in 2/29 → IDF = 2.67 → very high distinctiveness

### 2. Multi-Mode Inference

Map existing taxonomy tags to modes:

```typescript
const MODE_SIGNALS: Record<string, string[]> = {
  work: [
    'deep_work',
    'casual_work',
    'laptop_friendly',
    'power_outlets',
    'wifi_available',
    'no_time_limit',
    'late_night_work',
  ],
  rest: [
    'reading',
    'solo_time',
    'slow_morning',
    'healing_therapeutic',
    'quiet',
  ],
  social: [
    'catch_up_friends',
    'small_group',
    'date',
    'lively',
    'community_vibe',
  ],
  coffee: ['specialty_coffee_focused', 'coffee_tasting', 'roastery_onsite'],
};
```

For each shop, check which modes have signal tags present (with confidence >= 0.5). A shop gets assigned every mode it qualifies for. Minimum 1 mode — if nothing qualifies, fall back to the existing single mode from pass3b.

### 3. Type Changes

```typescript
// New processed enrichment type (does NOT modify EnrichmentData)
interface ProcessedEnrichmentData {
  tags: Array<{ id: string; confidence: number; distinctiveness: number }>;
  summary: string;
  topReviews: string[];
  modes: Array<'work' | 'rest' | 'social' | 'coffee'>;
  enrichedAt: string;
  modelId: string;
}

interface ProcessedShop extends Pass2Shop {
  enrichment: ProcessedEnrichmentData;
}
```

### 4. File Flow

```
pass3-enriched.json (raw Claude output, unchanged)
        ↓ pass3c-postprocess.ts
pass3c-processed.json (+ distinctiveness scores, multi-mode)
        ↓ pass4 reads this instead of pass3-enriched.json
pass4-embeddings.json
        ↓
pass5-search-test.ts
```

### 5. Downstream Changes

- **Pass 4 (embeddings):** Change input file from `pass3-enriched.json` to `pass3c-processed.json`. `composeEmbeddingText` sorts tags by distinctiveness so embedding text naturally prioritizes differentiating features.
- **Pass 5 (search):** `computeTaxonomyBoost` already works with tags. Mode filtering uses `modes.includes()` instead of `mode ===`.
- **Existing tests:** `pass3b-enrich.test.ts` stays as-is (tests raw enrichment). New tests for pass3c pure functions.

### 6. CLI

```bash
pnpm prebuild:pass3c    # Run post-processing
```

No API calls, no env vars needed. Pure local computation.
