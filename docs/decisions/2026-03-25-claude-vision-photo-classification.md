# ADR: Claude Vision for photo classification over URL pattern matching

Date: 2026-03-25

## Decision

Use Claude Haiku with thumbnail-sized images to classify scraped photos as MENU/VIBE/SKIP, rather than URL pattern matching or manual labelling.

## Context

DEV-18 requires separating photos into MENU (feeds menu extraction in DEV-6) and VIBE (feeds shop profile display). A classification mechanism was needed. Three approaches were evaluated.

## Alternatives Considered

- **URL pattern matching** (approach from `pass2-scrape.ts`): inspect URL path for keywords like `menu`, `food`, `菜單`. Rejected: Google Maps CDN URLs are opaque hashes (`/p/AF1Qip...`) with no semantic signal — pattern matching yields near-zero accuracy.

- **Manual labelling** (local contractor at NTD $200/hr): a person reviews and labels each photo. Rejected: one-time bootstrapping cost is comparable (~NTD $2,200 for 164 shops), but does not scale — must be repeated for every re-scrape and every new shop added. Also requires building a review UI.

- **Claude Vision with thumbnail rewriting (chosen)**: rewrite Google CDN URL size suffix from `=w1920-h1080-k-no` to `=w400-h225-k-no` before sending to Claude Haiku. Thumbnails cost ~10-15× fewer input tokens while retaining enough detail to classify MENU text vs ambience.

## Rationale

Claude Haiku Vision at thumbnail resolution costs ~$0.0002–0.0003 per shop — negligible at current and projected scale. It produces semantic classification that URL patterns cannot, scales automatically with new shops, and requires no human review infrastructure.

## Consequences

- Advantage: accurate semantic classification; scales to 10,000+ shops for ~$3 total
- Advantage: thumbnail rewrite is a trivial string substitution — no extra HTTP requests, no image hosting
- Advantage: MENU takes priority when a photo qualifies for both, maximising signal for DEV-6
- Disadvantage: classification quality depends on Claude Haiku's vision capability for text detection in noisy real-world photos; edge cases (low-res menus, non-Latin scripts) may misclassify
- Disadvantage: introduces a Claude API dependency in the worker pipeline (already present for enrichment)
