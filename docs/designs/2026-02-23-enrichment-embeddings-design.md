# Enrichment, Embeddings & Search Prototype Design

**Date:** 2026-02-23
**Hat:** CTO
**Status:** Approved

## Context

The 3-pass data collection pipeline is complete. `pass2-full.json` contains 29 verified Taipei coffee shops with ~20 Google Maps reviews each (579 total reviews, 18.5% empty text, mixed Traditional Chinese/English/Korean). Provider interfaces (`ILLMProvider`, `IEmbeddingsProvider`) are defined but unimplemented.

This design covers the next prebuild validation phase: enriching the raw data with taxonomy tags, generating embeddings, and testing semantic search against the 7/10 query success gate (ASSUMPTIONS.md #1 FATAL).

## Decisions

- **Scope:** Prebuild scripts outputting JSON files — no production infrastructure (Supabase, workers) yet.
- **Taxonomy:** LLM-assisted seed generation. Claude proposes tags from review analysis, user curates into canonical list.
- **LLM model:** Claude Sonnet first (quality ceiling), then Haiku comparison (production viability). Script supports `--model` flag.
- **Embedding input:** Enriched summary + taxonomy tags + top 3-5 review excerpts per shop (~500-1000 tokens).
- **Search prototype:** In-memory cosine similarity + taxonomy boost. pgvector is mathematically identical at 29 vectors.
- **Search included:** Full end-to-end validation in one design (enrichment → embeddings → search test).

## Architecture

Extends the existing pass-based pipeline:

```
pass2-full.json (29 shops, reviews, photos)
        │
        ▼
┌─── Pass 3a: Taxonomy Seed ────────────────────┐
│  Sample reviews → Claude → proposed tags       │
│  → USER CURATES → taxonomy.json                │
└────────────────────────────────────────────────┘
        │
        ▼
┌─── Pass 3b: Enrichment ───────────────────────┐
│  For each shop:                                │
│    reviews + categories + name                 │
│    → Claude (constrained to taxonomy)          │
│    → { tags[], summary, topReviews[] }         │
│  Output: pass3-enriched.json                   │
└────────────────────────────────────────────────┘
        │
        ▼
┌─── Pass 4: Embeddings ────────────────────────┐
│  For each shop:                                │
│    compose text = summary + tags + topReviews  │
│    → OpenAI text-embedding-3-small             │
│    → 1536-dim vector                           │
│  Output: pass4-embeddings.json                 │
└────────────────────────────────────────────────┘
        │
        ▼
┌─── Pass 5: Search Prototype ──────────────────┐
│  10 test queries → embed each query            │
│  → cosine similarity against all 29 vectors    │
│  → taxonomy boost reranking                    │
│  → output ranked results + evaluation report   │
└────────────────────────────────────────────────┘
```

**Scripts location:** `scripts/prebuild/data-pipeline/`
**Output location:** `data/prebuild/`

## Components

### Pass 3a: Taxonomy Seed Generator (`pass3a-taxonomy-seed.ts`)

**Purpose:** Extract a proposed taxonomy from real review data for user curation.

**Process:**
1. Sample ~50-60 diverse reviews across all 29 shops (stratified by rating, length, language)
2. Send to Claude with prompt: analyze Taiwan coffee shop reviews, propose taxonomy tags across 4 dimensions
3. Output: `taxonomy-proposed.json` (raw LLM output)
4. User curates → `taxonomy.json` (canonical list for enrichment)

**Taxonomy schema:**
```typescript
interface TaxonomyTag {
  id: string;                    // e.g., "has_outlets"
  dimension: TaxonomyDimension;  // 'functionality' | 'time' | 'ambience' | 'mode'
  label: string;                 // "Has power outlets"
  labelZh: string;               // "有插座"
}
```

**Design choice:** Taxonomy seed is intentionally manual-gated. The LLM proposes, the user decides. This ensures the canonical taxonomy reflects product vision, not just review content.

### Pass 3b: Enrichment Worker (`pass3b-enrich.ts`)

**Purpose:** Classify each shop's reviews against the curated taxonomy and produce a structured profile.

**Input per shop:** name, categories, description, all non-empty reviews, the curated taxonomy

**Output per shop:**
```typescript
interface EnrichedShop extends Pass2Shop {
  enrichment: {
    tags: Array<{ id: string; confidence: number }>;
    summary: string;           // 2-3 sentence natural language profile
    topReviews: string[];      // 3-5 most informative review excerpts
    mode: 'work' | 'rest' | 'social' | 'mixed';
    enrichedAt: string;        // ISO timestamp
    modelId: string;           // e.g., "claude-sonnet-4-6"
  };
}
```

**Prompt strategy:**
- System prompt: structured extraction with constrained output
- Full taxonomy provided — model selects only from this list
- Each tag gets a confidence score (0-1) for filtering low-confidence tags later
- Summary written as a natural-language shop profile (becomes embedding input)
- `topReviews` selected as most informative for visit decisions

**Error handling:**
- Retry with exponential backoff on rate limits (429)
- Skip and log on persistent failures
- Save partial results on interrupt (resume via `--start-from` flag)
- `--dry-run` flag to test prompt on 1 shop

**CLI flags:**
- `--model <id>`: Select Claude model (default: sonnet)
- `--start-from <index>`: Resume from a specific shop index
- `--dry-run`: Process only the first shop

**Output:** `data/prebuild/pass3-enriched.json`

### Pass 4: Embedding Generator (`pass4-embed.ts`)

**Purpose:** Generate vector embeddings for each enriched shop.

**Embedding input composition per shop:**
```
{name}

{summary}

Tags: {tag labels joined by comma}

Selected reviews:
{topReview1}
{topReview2}
{topReview3}
```

**Rationale:** Structured layout puts the most searchable content (name, summary, tags) first, then authentic user language from reviews. Mirrors how users search — by attribute or by vibe.

**Output per shop:**
```typescript
interface ShopEmbedding {
  cafenomad_id: string;
  google_place_id: string;
  name: string;
  embedding: number[];       // 1536 dimensions
  embeddedText: string;      // the composed text (for debugging)
  modelId: string;           // "text-embedding-3-small"
  embeddedAt: string;
}
```

**Output:** `data/prebuild/pass4-embeddings.json`

**Cost:** ~$0.001 for 29 shops. Essentially free.

### Pass 5: Search Prototype (`pass5-search-test.ts`)

**Purpose:** Test 10 natural language queries against 29-shop embeddings. Validate the 7/10 gate.

**Process:**
1. Load test queries from `search-queries.json` (10 queries, mix of attribute/vibe/specific/mixed-language)
2. Embed each query via OpenAI (same model)
3. Compute cosine similarity against all 29 shop vectors
4. Apply taxonomy boost: if query matches a shop's taxonomy tag, add configurable boost to score
5. Return top-5 ranked results per query

**Test query categories:**
- Attribute: "有插座可以工作的咖啡廳" (cafe with outlets for working)
- Vibe: "安靜適合讀書的地方" (quiet place for reading)
- Specific: "有好喝拿鐵的咖啡廳" (cafe with good lattes)
- Mixed-language: "cozy cafe near MRT"
- Mode: "適合跟朋友聊天的咖啡廳" (cafe for chatting with friends)

**Taxonomy boost algorithm:**
1. Embed the query
2. Tag-matching step: check if query text contains taxonomy tag labels (substring match or embedding similarity > threshold)
3. For shops with matching tags, add boost to cosine similarity score
4. Re-rank

**Output per query:**
```typescript
interface SearchTestResult {
  query: string;
  results: Array<{
    rank: number;
    name: string;
    score: number;           // raw cosine similarity
    boostedScore: number;    // after taxonomy boost
    matchedTags: string[];
  }>;
}
```

**Output:** `data/prebuild/pass5-search-results.json`

**Evaluation:** Manual review — user scores each query pass/fail. Gate = 7/10 queries return sensible top-3 results.

## Cost Estimate

| Component | Model | Estimated Cost |
|-----------|-------|---------------|
| Pass 3a (taxonomy seed) | Claude Sonnet | ~$0.05 |
| Pass 3b (enrichment, Sonnet) | Claude Sonnet | ~$0.50 |
| Pass 3b (enrichment, Haiku comparison) | Claude Haiku | ~$0.04-0.17 |
| Pass 4 (embeddings) | OpenAI text-embedding-3-small | ~$0.001 |
| Pass 5 (query embeddings) | OpenAI text-embedding-3-small | ~$0.0001 |
| **Total** | | **~$0.60-0.80** |

## Testing Strategy

- **Pass 3a:** Manual inspection of proposed taxonomy completeness and relevance
- **Pass 3b:** Spot-check 5 shops for tag accuracy. Run `--dry-run` first to validate prompt.
- **Pass 4:** Verify embedding dimensions (1536). Spot-check that composed text reads naturally.
- **Pass 5:** The 7/10 gate IS the test. If it fails, iterate on enrichment prompt and taxonomy.

## Validation Gate

**FATAL assumption #1:** Semantic search on enriched data produces a "wow" moment.
**Gate:** 10 queries, 7 must return sensible top-3 results.
**If pass:** Proceed to Phase 1 build (Supabase, production workers, UI).
**If fail:** Iterate on enrichment prompt, taxonomy, or embedding composition. If still failing after 2-3 iterations, re-evaluate the approach per ASSUMPTIONS.md risk mitigation.

## File Manifest

```
scripts/prebuild/data-pipeline/
├── pass3a-taxonomy-seed.ts
├── pass3b-enrich.ts
├── pass4-embed.ts
├── pass5-search-test.ts
├── search-queries.json
└── types.ts                    # Extended with enrichment types

data/prebuild/
├── taxonomy-proposed.json      # Raw LLM taxonomy proposal
├── taxonomy.json               # Curated canonical taxonomy
├── pass3-enriched.json         # Enriched shop profiles
├── pass4-embeddings.json       # Shop vectors + embedded text
└── pass5-search-results.json   # Search test results
```
