import { ApifyClient } from 'apify-client';
import type { ApifyPlaceResult } from '../types';

// ─── Constants ─────────────────────────────────────────────────

const ACTOR_ID = 'compass/crawler-google-places';

// ─── Client ────────────────────────────────────────────────────

function getClient(): ApifyClient {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error(
      'APIFY_TOKEN environment variable is required. Get one at https://console.apify.com/account/integrations'
    );
  }
  return new ApifyClient({ token });
}

// ─── Pass 1: Places-only search (no reviews, no images) ───────

export interface VerifyInput {
  searchTerms: string[];
  maxCrawledPlacesPerSearch: number;
}

/**
 * Run a places-only search — returns basic place info without reviews or photos.
 * Used in Pass 1 to verify which shops are still open.
 */
export async function searchPlaces(
  input: VerifyInput
): Promise<ApifyPlaceResult[]> {
  const client = getClient();

  console.log(
    `[apify] Starting places-only search for ${input.searchTerms.length} terms...`
  );

  const { defaultDatasetId } = await client.actor(ACTOR_ID).call({
    searchStringsArray: input.searchTerms,
    maxCrawledPlacesPerSearch: input.maxCrawledPlacesPerSearch,
    language: 'zh-TW',
    maxReviews: 0,
    maxImages: 0,
    oneEntryPerQuery: false,
  });

  const { items } = await client.dataset(defaultDatasetId).listItems();
  console.log(`[apify] Got ${items.length} place results`);

  return items as unknown as ApifyPlaceResult[];
}

// ─── Pass 2: Full scrape by place ID (reviews + photos) ───────

export interface FullScrapeInput {
  placeIds: string[];
  maxReviews: number;
  maxImages: number;
}

/**
 * Scrape full data for places identified by Google Place ID.
 * Deterministic — no matching ambiguity since we use place IDs directly.
 */
export async function scrapePlaces(
  input: FullScrapeInput
): Promise<ApifyPlaceResult[]> {
  const client = getClient();

  const startUrls = input.placeIds.map((id) => ({
    url: `https://www.google.com/maps/place/?q=place_id:${id}`,
  }));

  console.log(
    `[apify] Starting full scrape for ${startUrls.length} places...`
  );

  const { defaultDatasetId } = await client.actor(ACTOR_ID).call({
    startUrls,
    language: 'zh-TW',
    maxReviews: input.maxReviews,
    maxImages: input.maxImages,
    scrapeReviewerName: false,
    scrapeReviewerId: false,
    scrapeReviewerUrl: false,
    scrapeReviewId: false,
  });

  const { items } = await client.dataset(defaultDatasetId).listItems();
  console.log(`[apify] Got ${items.length} full results`);

  return items as unknown as ApifyPlaceResult[];
}
