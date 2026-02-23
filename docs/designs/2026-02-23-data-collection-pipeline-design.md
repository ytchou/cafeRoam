# Data Collection Pipeline Design

**Date:** 2026-02-23
**Status:** Implemented
**Plan:** [docs/plans/2026-02-23-data-collection-pipeline-plan.md](../plans/2026-02-23-data-collection-pipeline-plan.md)

## Overview

A 3-pass data pipeline that seeds ~1,600 Taipei coffee shops from Cafe Nomad, verifies which are still open via Apify/Google Maps, and scrapes reviews + photos for confirmed-open shops.

## Architecture

```
Pass 0: Cafe Nomad API → filter → pass0-seed.json (~1,500-1,650 shops)
Pass 1: pass0-seed.json → Apify search → match → pass1-verified.json + pass1-unmatched.json
Pass 2: pass1-verified.json → Apify scrape by place ID → pass2-full.json
```

Each pass reads the previous pass's JSON output from `data/prebuild/`. The pipeline outputs an enrichment-ready dataset that hands off to Claude Haiku (separate system).

## Pass 0: Seed

**Source:** Cafe Nomad API (public, no auth) — `https://cafenomad.tw/api/v1.2/cafes/taipei`

**Filters applied:**

1. Known-closed keywords in name: `已歇業`, `暫停營業`, `已關`, `已結束`
2. Shell entries: missing name, address, or coordinates; latitude/longitude = 0
3. Out-of-bounds: coordinates outside greater Taipei bounding box (lat 24.95–25.22, lng 121.40–121.65)
4. Duplicates: same name within 50m (keeps first occurrence)

**Expected throughput:** ~1,672 input → ~1,500-1,650 output

## Pass 1: Verify

**Source:** Apify `compass/crawler-google-places` actor (places-only mode, no reviews/photos)

**Matching algorithm:**

- Search term: `{shop_name} {shop_address}`
- Distance threshold: 200m
- Name similarity: Sørensen-Dice coefficient ≥ 0.5
- Confidence = nameScore × 0.6 + distanceScore × 0.4

**Outputs:**

- `pass1-verified.json`: shops matched to Google Maps with confidence score
- `pass1-unmatched.json`: shops that couldn't be matched (for manual review)

**Expected cost:** ~$6.40 (1,600 searches × $4/1,000)

## Pass 2: Full Scrape

**Source:** Same Apify actor, full scrape mode with Google Place IDs (deterministic)

**Data collected per shop:**

- 20 reviews (text, stars, published_at, language — no reviewer PII)
- 5 photos (menu-prioritized by URL pattern matching)
- Menu URL, price range, description

**Expected cost:** ~$15-18

## Data Quality Notes

From Cafe Nomad spot-checks:

- ~75% of entries missing opening hours
- ~29% zero-rating shells
- ~15+ known-closed shops in the dataset
- Names and coordinates are generally reliable

## Handoff to Enrichment

`pass2-full.json` is the input to the Claude Haiku enrichment step, which will:

- Generate a semantic description combining reviews and categories
- Classify the shop into work/rest/social modes
- Generate embedding vectors for semantic search
