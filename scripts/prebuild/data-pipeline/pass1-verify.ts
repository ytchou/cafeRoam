import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { searchPlaces } from './utils/apify-client';
import { findBestMatch } from './utils/matching';
import type { Pass0Shop, Pass1Shop, UnmatchedShop, ApifyPlaceResult } from './types';

// ─── Constants ─────────────────────────────────────────────────

const INPUT_FILE = 'data/prebuild/pass0-seed.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_VERIFIED = `${OUTPUT_DIR}/pass1-verified.json`;
const OUTPUT_UNMATCHED = `${OUTPUT_DIR}/pass1-unmatched.json`;

// ─── Exported Functions (testable) ─────────────────────────────

/** Build search terms from shop name + address */
export function buildSearchTerms(shops: Pass0Shop[]): string[] {
  return shops.map((s) => `${s.name} ${s.address}`);
}

/** Merge a Pass0Shop with its matched ApifyPlaceResult into a Pass1Shop */
export function mergeMatch(
  shop: Pass0Shop,
  result: ApifyPlaceResult,
  confidence: number
): Pass1Shop {
  return {
    cafenomad_id: shop.cafenomad_id,
    google_place_id: result.placeId,
    match_confidence: confidence,
    name: shop.name,
    address: shop.address,
    latitude: shop.latitude,
    longitude: shop.longitude,
    mrt: shop.mrt,
    limited_time: shop.limited_time,
    socket: shop.socket,
    social_url: shop.social_url,
    // Google Maps data
    google_name: result.title,
    google_address: result.address,
    google_latitude: result.location.lat,
    google_longitude: result.location.lng,
    rating: result.totalScore,
    review_count: result.reviewsCount,
    opening_hours: result.openingHours
      ? result.openingHours.map((h) => `${h.day}: ${h.hours}`)
      : null,
    phone: result.phone,
    website: result.website,
    categories: result.categories,
  };
}

// ─── Pipeline ──────────────────────────────────────────────────

async function runPass1(shops: Pass0Shop[]): Promise<{
  verified: Pass1Shop[];
  unmatched: UnmatchedShop[];
}> {
  const searchTerms = buildSearchTerms(shops);
  const apifyResults = await searchPlaces({
    searchTerms,
    maxCrawledPlacesPerSearch: 1,
  });

  console.log(
    `[pass1] Matching ${shops.length} shops against ${apifyResults.length} Google results...`
  );

  const verified: Pass1Shop[] = [];
  const unmatched: UnmatchedShop[] = [];

  for (const shop of shops) {
    const match = findBestMatch(shop, apifyResults);

    if (match) {
      const result = apifyResults.find((r) => r.placeId === match.placeId)!;
      verified.push(mergeMatch(shop, result, match.confidence));
    } else {
      const closestResult = apifyResults.find((r) => {
        const nameMatch = r.title.includes(shop.name) || shop.name.includes(r.title);
        return nameMatch;
      });

      let reason: UnmatchedShop['reason'] = 'no_match';
      if (closestResult?.permanentlyClosed) reason = 'permanently_closed';
      else if (closestResult?.temporarilyClosed) reason = 'temporarily_closed';

      unmatched.push({
        cafenomad_id: shop.cafenomad_id,
        name: shop.name,
        address: shop.address,
        latitude: shop.latitude,
        longitude: shop.longitude,
        reason,
      });
    }
  }

  return { verified, unmatched };
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log('[pass1] Reading Pass 0 output...');
  const shops: Pass0Shop[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`[pass1] Loaded ${shops.length} shops from ${INPUT_FILE}`);

  const { verified, unmatched } = await runPass1(shops);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_VERIFIED, JSON.stringify(verified, null, 2));
  writeFileSync(OUTPUT_UNMATCHED, JSON.stringify(unmatched, null, 2));

  console.log('[pass1] Pipeline complete:');
  console.log(`  Input:      ${shops.length}`);
  console.log(`  Verified:   ${verified.length}`);
  console.log(`  Unmatched:  ${unmatched.length}`);
  console.log(`  Saved to:   ${OUTPUT_VERIFIED}`);
  console.log(`  Review:     ${OUTPUT_UNMATCHED}`);
}

const isDirectRun = process.argv[1]?.includes('pass1-verify');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass1] Fatal error:', err);
    process.exit(1);
  });
}
