import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { scrapePlaces } from './utils/apify-client';
import type {
  Pass1Shop,
  Pass2Shop,
  PhotoData,
  ReviewData,
  ApifyPlaceResult,
} from './types';

// ─── Constants ─────────────────────────────────────────────────

const INPUT_FILE = 'data/prebuild/pass1-verified.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass2-full.json`;
const MAX_PHOTOS = 5;
const MAX_REVIEWS = 20;

// ─── Photo Categorization ─────────────────────────────────────

const MENU_PATTERNS = ['menu', '菜單', '價目'];
const FOOD_PATTERNS = ['food', 'drink', 'coffee', 'latte', '咖啡', '餐'];

/**
 * Categorize photo URLs and limit to MAX_PHOTOS.
 * Priority: menu-tagged → food/drink → general.
 */
export function categorizePhotos(urls: string[] | undefined): PhotoData[] {
  if (!urls || urls.length === 0) return [];

  const categorized = urls.map((url) => {
    const lower = url.toLowerCase();

    if (MENU_PATTERNS.some((p) => lower.includes(p))) {
      return { url, category: 'menu', is_menu: true };
    }
    if (FOOD_PATTERNS.some((p) => lower.includes(p))) {
      return { url, category: 'food', is_menu: false };
    }
    return { url, category: 'general', is_menu: false };
  });

  categorized.sort((a, b) => {
    const order = { menu: 0, food: 1, general: 2 };
    return order[a.category as keyof typeof order] - order[b.category as keyof typeof order];
  });

  return categorized.slice(0, MAX_PHOTOS);
}

// ─── Data Merging ──────────────────────────────────────────────

/** Merge Pass1Shop + full Apify result into enrichment-ready Pass2Shop */
export function mergeFullData(
  shop: Pass1Shop,
  result: ApifyPlaceResult
): Pass2Shop {
  const reviews: ReviewData[] = (result.reviews ?? [])
    .filter((r) => r.text !== null)
    .slice(0, MAX_REVIEWS)
    .map((r) => ({
      text: r.text!,
      stars: r.stars,
      published_at: r.publishAt,
      language: r.language ?? 'unknown',
    }));

  return {
    cafenomad_id: shop.cafenomad_id,
    google_place_id: shop.google_place_id,
    match_confidence: shop.match_confidence,
    name: shop.name,
    address: shop.address,
    latitude: shop.latitude,
    longitude: shop.longitude,
    mrt: shop.mrt,
    rating: shop.rating,
    review_count: shop.review_count,
    opening_hours: shop.opening_hours,
    phone: shop.phone,
    website: shop.website,
    categories: shop.categories,
    price_range: result.price ?? null,
    description: result.description ?? null,
    menu_url: result.menu?.url ?? null,
    limited_time: shop.limited_time,
    socket: shop.socket,
    social_url: shop.social_url,
    reviews,
    photos: categorizePhotos(result.imageUrls),
  };
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log('[pass2] Reading Pass 1 verified output...');
  const shops: Pass1Shop[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`[pass2] Loaded ${shops.length} verified shops from ${INPUT_FILE}`);

  const placeIds = shops.map((s) => s.google_place_id);

  const apifyResults = await scrapePlaces({
    placeIds,
    maxReviews: MAX_REVIEWS,
    maxImages: MAX_PHOTOS,
  });

  const resultMap = new Map<string, ApifyPlaceResult>();
  for (const result of apifyResults) {
    resultMap.set(result.placeId, result);
  }

  const output: Pass2Shop[] = [];
  let missingCount = 0;

  for (const shop of shops) {
    const result = resultMap.get(shop.google_place_id);
    if (result) {
      output.push(mergeFullData(shop, result));
    } else {
      console.warn(
        `[pass2] No Apify result for ${shop.name} (${shop.google_place_id})`
      );
      missingCount++;
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  const withReviews = output.filter((s) => s.reviews.length > 0).length;
  const withPhotos = output.filter((s) => s.photos.length > 0).length;
  const withMenu = output.filter((s) => s.menu_url !== null).length;

  console.log('[pass2] Pipeline complete:');
  console.log(`  Input:        ${shops.length}`);
  console.log(`  Scraped:      ${output.length}`);
  console.log(`  Missing:      ${missingCount}`);
  console.log(`  With reviews: ${withReviews}`);
  console.log(`  With photos:  ${withPhotos}`);
  console.log(`  With menu:    ${withMenu}`);
  console.log(`  Saved to:     ${OUTPUT_FILE}`);
}

const isDirectRun = process.argv[1]?.includes('pass2-scrape');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass2] Fatal error:', err);
    process.exit(1);
  });
}
