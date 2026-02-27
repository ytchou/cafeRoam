# ADR: Apify Over Outscraper for Google Maps Scraping

**Date:** 2026-02-23
**Status:** Accepted
**Context:** CafeRoam needs to scrape Google Maps data for ~1,672 Taipei coffee shops (reviews, photos, hours, status).

## Decision

Use Apify (`compass/crawler-google-places`) instead of Outscraper.

## Comparison

| Factor                               | Apify                          | Outscraper                            |
| ------------------------------------ | ------------------------------ | ------------------------------------- |
| Cost (1,672 shops, places + reviews) | ~$26                           | ~$101                                 |
| Per-query pricing                    | ~$4/1,000 searches             | ~$3/1,000 places + ~$14/1,000 reviews |
| API flexibility                      | Full control via Actor input   | REST API with fixed parameters        |
| Review scraping                      | Same actor, `maxReviews` param | Separate endpoint, separate billing   |
| Photo scraping                       | Same actor, `maxImages` param  | Not supported in base tier            |
| Menu URL                             | Included in output             | Included in output                    |
| Free tier                            | $5 platform credit/month       | 100 places/month                      |
| SDK                                  | `apify-client` (TypeScript)    | REST-only (no official SDK)           |

## Rationale

- **4x cheaper** for the same job (~$26 vs ~$101)
- Single actor handles both places-only verification and full review+photo scraping
- `apify-client` npm package simplifies integration
- Outscraper has better documentation but the cost difference is decisive for a pre-revenue project

## Consequences

- Tied to Apify platform as an ongoing dependency (user submissions and smart re-enrichment both require scraping)
- Actor output schema may change without notice (mitigated by pinning to known-good version)

## Update (2026-02-26)

Originally framed as a "one-time scrape," Apify is now an ongoing dependency:

- **User submissions**: Users submit Google Maps URLs → Apify scrapes reviews + photos for enrichment
- **Smart re-enrichment**: Daily staleness sweep uses Apify to check for new reviews before re-enriching
- Google Places API (New) was evaluated as an alternative but rejected due to a hard 5-review limit per place, which is insufficient for AI enrichment (needs 10-20 reviews)
