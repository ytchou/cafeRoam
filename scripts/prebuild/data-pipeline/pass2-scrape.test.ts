import { describe, it, expect } from 'vitest';
import { mergeFullData, categorizePhotos } from './pass2-scrape';
import type { Pass1Shop, ApifyPlaceResult } from './types';

// ─── Helpers ───────────────────────────────────────────────────

function makePass1Shop(overrides: Partial<Pass1Shop> = {}): Pass1Shop {
  return {
    cafenomad_id: 'cn-1',
    google_place_id: 'ChIJ_test',
    match_confidence: 0.85,
    name: '好咖啡',
    address: '台北市中山區南京東路100號',
    latitude: 25.05,
    longitude: 121.52,
    mrt: '中山',
    limited_time: 'no',
    socket: 'yes',
    social_url: '',
    google_name: '好咖啡',
    google_address: '100號 南京東路, 中山區',
    google_latitude: 25.0501,
    google_longitude: 121.5201,
    rating: 4.3,
    review_count: 200,
    opening_hours: ['Monday: 09:00-18:00'],
    phone: '+886-2-1234-5678',
    website: 'https://example.com',
    categories: ['Coffee shop', 'Cafe'],
    ...overrides,
  };
}

function makeFullApifyResult(
  overrides: Partial<ApifyPlaceResult> = {}
): ApifyPlaceResult {
  return {
    title: '好咖啡',
    placeId: 'ChIJ_test',
    address: '100號 南京東路, 中山區',
    location: { lat: 25.0501, lng: 121.5201 },
    totalScore: 4.3,
    reviewsCount: 200,
    openingHours: null,
    phone: null,
    website: null,
    categoryName: 'Coffee shop',
    categories: ['Coffee shop'],
    permanentlyClosed: false,
    temporarilyClosed: false,
    url: 'https://maps.google.com/?cid=123',
    reviews: [
      { text: '好喝的咖啡', stars: 5, publishAt: '2026-01-15', language: 'zh-TW' },
      { text: 'Great latte', stars: 4, publishAt: '2026-01-10', language: 'en' },
    ],
    imageUrls: [
      'https://lh5.googleusercontent.com/menu1',
      'https://lh5.googleusercontent.com/interior1',
      'https://lh5.googleusercontent.com/food1',
    ],
    price: '$$',
    description: 'A cozy coffee shop in Zhongshan',
    menu: { url: 'https://example.com/menu' },
    ...overrides,
  };
}

// ─── categorizePhotos ──────────────────────────────────────────

describe('categorizePhotos', () => {
  it('categorizes menu-related URLs', () => {
    const photos = categorizePhotos([
      'https://lh5.googleusercontent.com/p/menu-photo-1',
    ]);
    expect(photos[0].is_menu).toBe(true);
    expect(photos[0].category).toBe('menu');
  });

  it('categorizes food-related URLs', () => {
    const photos = categorizePhotos([
      'https://lh5.googleusercontent.com/p/food-photo-1',
    ]);
    expect(photos[0].category).toBe('food');
    expect(photos[0].is_menu).toBe(false);
  });

  it('defaults to general category', () => {
    const photos = categorizePhotos([
      'https://lh5.googleusercontent.com/p/random-photo-1',
    ]);
    expect(photos[0].category).toBe('general');
    expect(photos[0].is_menu).toBe(false);
  });

  it('limits to 5 photos', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}`);
    const photos = categorizePhotos(urls);
    expect(photos).toHaveLength(5);
  });

  it('returns empty array for undefined input', () => {
    expect(categorizePhotos(undefined)).toEqual([]);
  });
});

// ─── mergeFullData ─────────────────────────────────────────────

describe('mergeFullData', () => {
  it('produces a complete Pass2Shop from Pass1Shop + full Apify result', () => {
    const shop = makePass1Shop();
    const result = makeFullApifyResult();
    const merged = mergeFullData(shop, result);

    expect(merged.cafenomad_id).toBe('cn-1');
    expect(merged.google_place_id).toBe('ChIJ_test');
    expect(merged.price_range).toBe('$$');
    expect(merged.description).toBe('A cozy coffee shop in Zhongshan');
    expect(merged.menu_url).toBe('https://example.com/menu');
    expect(merged.reviews).toHaveLength(2);
    expect(merged.reviews[0].text).toBe('好喝的咖啡');
    expect(merged.reviews[0].stars).toBe(5);
    expect(merged.photos).toHaveLength(3);
  });

  it('handles missing reviews gracefully', () => {
    const shop = makePass1Shop();
    const result = makeFullApifyResult({ reviews: undefined });
    const merged = mergeFullData(shop, result);

    expect(merged.reviews).toEqual([]);
  });

  it('handles missing photos gracefully', () => {
    const shop = makePass1Shop();
    const result = makeFullApifyResult({ imageUrls: undefined });
    const merged = mergeFullData(shop, result);

    expect(merged.photos).toEqual([]);
  });

  it('handles null menu gracefully', () => {
    const shop = makePass1Shop();
    const result = makeFullApifyResult({ menu: null });
    const merged = mergeFullData(shop, result);

    expect(merged.menu_url).toBeNull();
  });

  it('filters out reviews with null text', () => {
    const shop = makePass1Shop();
    const result = makeFullApifyResult({
      reviews: [
        { text: null, stars: 3, publishAt: '2026-01-01' },
        { text: 'Good coffee', stars: 4, publishAt: '2026-01-02', language: 'en' },
      ],
    });
    const merged = mergeFullData(shop, result);

    expect(merged.reviews).toHaveLength(1);
    expect(merged.reviews[0].text).toBe('Good coffee');
  });
});
