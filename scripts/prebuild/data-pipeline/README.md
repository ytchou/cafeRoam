# Data Collection Pipeline

One-time scripts to collect and verify Taipei coffee shop data before building the app.

## Prerequisites

- Node.js 20+ and pnpm
- `APIFY_TOKEN` environment variable (for Pass 1 and Pass 2)

## Pipeline

| Pass | Command | Cost | Input | Output |
|------|---------|------|-------|--------|
| 0 | `pnpm prebuild:pass0` | Free | Cafe Nomad API | `data/prebuild/pass0-seed.json` |
| 1 | `pnpm prebuild:pass1` | ~$6.40 | Pass 0 output | `data/prebuild/pass1-verified.json` + `pass1-unmatched.json` |
| 2 | `pnpm prebuild:pass2` | ~$15-18 | Pass 1 output | `data/prebuild/pass2-full.json` |

## Quick Start

```bash
# Pass 0: Seed from Cafe Nomad (free, ~30s)
pnpm prebuild:pass0

# Pass 1: Verify on Google Maps via Apify (~$6.40, 1-3 hours)
export APIFY_TOKEN=your_token_here
pnpm prebuild:pass1

# Review unmatched shops
# → data/prebuild/pass1-unmatched.json

# Pass 2: Full scrape with reviews + photos (~$15-18, 3-6 hours)
pnpm prebuild:pass2
```

## Validation Subset (recommended first run)

Before running the full pipeline, test with 30 shops:

1. Run Pass 0 on full dataset (free)
2. Manually pick 30 diverse shops from `pass0-seed.json`
3. Run Pass 1 on those 30 (~$0.12)
4. Run Pass 2 on confirmed shops (~$0.20)
5. Inspect `pass2-full.json` for data quality

## Output Schema

See `types.ts` for the full type definitions. The final output (`pass2-full.json`) contains enrichment-ready shop data with reviews and photos — the handoff point to Claude Haiku enrichment.

## File Structure

```
scripts/prebuild/data-pipeline/
├── pass0-seed.ts          # Cafe Nomad → filtered seed
├── pass1-verify.ts        # Seed → Google Maps verification
├── pass2-scrape.ts        # Verified → full reviews + photos
├── types.ts               # Shared type definitions
├── utils/
│   ├── apify-client.ts    # Thin Apify wrapper
│   ├── filters.ts         # Closed/shell/bounds/dedup filters
│   └── matching.ts        # Name fuzzy match + coordinate proximity
└── README.md
```
