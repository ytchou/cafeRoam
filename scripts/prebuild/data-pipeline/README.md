# Data Collection Pipeline

One-time scripts to collect and verify Taipei coffee shop data before building the app.

## Prerequisites

- Node.js 20+ and pnpm
- `APIFY_TOKEN` environment variable (for Pass 1 and Pass 2)

## Pipeline

| Pass | Command | Cost | Input | Output |
|------|---------|------|-------|--------|
| 0 | `pnpm prebuild:pass0` | Free | Cafe Nomad API | `data/prebuild/pass0-seed.json` |
| 1 | `pnpm prebuild:pass1` | ~$6.40 | Pass 0 output | `pass1-verified.json` + `pass1-review.json` + `pass1-unmatched.json` |
| 2 | `pnpm prebuild:pass2` | ~$15-18 | Pass 1 verified output | `data/prebuild/pass2-full.json` |

## Quick Start

```bash
# Pass 0: Seed from Cafe Nomad (free, ~30s)
pnpm prebuild:pass0

# Pass 1: Verify on Google Maps via Apify (~$6.40, 1-3 hours)
export APIFY_TOKEN=your_token_here
pnpm prebuild:pass1

# Review medium-confidence shops before proceeding
# → data/prebuild/pass1-review.json  (needs human review)
# → data/prebuild/pass1-unmatched.json  (no match found)

# Pass 2: Full scrape with reviews + photos (~$15-18, 3-6 hours)
# Uses pass1-verified.json — do NOT include review pile without inspection
pnpm prebuild:pass2
```

## Pass 1 Output: 3-Tier Confidence

Pass 1 routes each shop into one of three output files based on match confidence:

| Tier | Confidence | File | Action |
|------|------------|------|--------|
| High | ≥ 0.75 | `pass1-verified.json` | Auto-proceed to Pass 2 |
| Medium | 0.50–0.74 | `pass1-review.json` | Human review required |
| Low / None | < 0.50 | `pass1-unmatched.json` | Manual lookup or skip |

### Why 3 tiers?

Taiwan has 524 路易莎, 500 Starbucks, and 435 85°C locations. With multiple chain stores
within 200m of each other, a 2-tier matched/unmatched system cannot distinguish:
- Same shop, slightly different name rendering → high confidence
- Same brand, different branch → should be rejected (chain-aware logic handles this)
- Partial match (name similarity 0.50–0.74) → medium tier, human review

## Name Matching Algorithm

Pass 1 uses **fuzzball `token_set_ratio`** with chain-aware disambiguation:

- **Name normalization**: Full-width → half-width, lowercase, whitespace collapse, noise suffix stripping (咖啡館, 咖啡店, coffee shop, etc.)
- **Chain detection**: Top 10 Taiwan chains (路易莎, 星巴克, 85度C, cama, 丹堤, 黑沃, 伯朗, 怡客, 西雅圖, Fika Fika) with aliases
- **Chain-aware matching**: For chain shops, requires brand match then scores on branch similarity — prevents 路易莎 中山店 from matching 路易莎 信義店
- **token_set_ratio**: Handles token reordering and subset matching better than character-set Dice

See `docs/decisions/2026-02-23-name-matching-algorithm.md` for the full algorithm ADR.

## Validation Subset (recommended first run)

Before running the full pipeline, test with 30 shops:

1. Run Pass 0 on full dataset (free)
2. Manually pick 30 diverse shops from `pass0-seed.json`
3. Run Pass 1 on those 30 (~$0.12)
4. Inspect `pass1-review.json` — tune confidence thresholds if needed
5. Run Pass 2 on confirmed shops (~$0.20)
6. Inspect `pass2-full.json` for data quality

## Output Schema

See `types.ts` for the full type definitions. The final output (`pass2-full.json`) contains enrichment-ready shop data with reviews and photos — the handoff point to Claude Haiku enrichment.

## File Structure

```
scripts/prebuild/data-pipeline/
├── pass0-seed.ts              # Cafe Nomad → filtered seed
├── pass1-verify.ts            # Seed → Google Maps verification (3-tier output)
├── pass2-scrape.ts            # Verified → full reviews + photos
├── types.ts                   # Shared type definitions
├── utils/
│   ├── apify-client.ts        # Thin Apify wrapper
│   ├── chain-dictionary.ts    # Taiwan coffee chain brands + aliases
│   ├── filters.ts             # Closed/shell/bounds/dedup filters
│   ├── fuzzball.d.ts          # Type declarations for fuzzball CJS module
│   ├── matching.ts            # Name fuzzy match + coordinate proximity
│   └── name-normalizer.ts     # Suffix stripping + full-width normalization
└── README.md
```
