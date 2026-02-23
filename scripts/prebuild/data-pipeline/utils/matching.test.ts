import { describe, it, expect } from 'vitest';
import { fuzzyNameScore, findBestMatch } from './matching';
import type { Pass0Shop, ApifyPlaceResult } from '../types';

// ─── Helpers ───────────────────────────────────────────────────

function makePass0Shop(overrides: Partial<Pass0Shop> = {}): Pass0Shop {
  return {
    cafenomad_id: 'cn-1',
    name: '好咖啡',
    address: '台北市中山區南京東路100號',
    latitude: 25.05,
    longitude: 121.52,
    social_url: '',
    mrt: '中山',
    limited_time: 'no',
    socket: 'yes',
    ...overrides,
  };
}

function makeApifyResult(
  overrides: Partial<ApifyPlaceResult> = {}
): ApifyPlaceResult {
  return {
    title: '好咖啡',
    placeId: 'ChIJ_test123',
    address: '100號 南京東路, 中山區, 台北市',
    location: { lat: 25.0501, lng: 121.5201 },
    totalScore: 4.2,
    reviewsCount: 150,
    openingHours: null,
    phone: null,
    website: null,
    categoryName: 'Coffee shop',
    categories: ['Coffee shop', 'Cafe'],
    permanentlyClosed: false,
    temporarilyClosed: false,
    url: 'https://maps.google.com/?cid=123',
    ...overrides,
  };
}

// ─── fuzzyNameScore ────────────────────────────────────────────

describe('fuzzyNameScore', () => {
  it('returns 1.0 for identical names', () => {
    expect(fuzzyNameScore('好咖啡', '好咖啡')).toBe(1.0);
  });

  it('returns 1.0 for identical names after whitespace normalization', () => {
    expect(fuzzyNameScore('好 咖啡', '好咖啡')).toBe(1.0);
  });

  it('returns >0.5 for names that share most characters', () => {
    expect(fuzzyNameScore('好咖啡 中山店', '好咖啡')).toBeGreaterThan(0.5);
  });

  it('returns 0.0 for completely different names', () => {
    expect(fuzzyNameScore('路易莎', 'Starbucks')).toBe(0.0);
  });

  it('is case-insensitive for Latin characters', () => {
    expect(fuzzyNameScore('Cafe ABC', 'cafe abc')).toBe(1.0);
  });
});

// ─── findBestMatch ─────────────────────────────────────────────

describe('findBestMatch', () => {
  it('matches shop to closest Google result within 200m with >50% name overlap', () => {
    const shop = makePass0Shop();
    const results = [
      makeApifyResult(),
      makeApifyResult({
        title: '壞咖啡',
        placeId: 'ChIJ_other',
        location: { lat: 25.06, lng: 121.53 },
      }),
    ];

    const match = findBestMatch(shop, results);
    expect(match).not.toBeNull();
    expect(match!.placeId).toBe('ChIJ_test123');
    expect(match!.confidence).toBeGreaterThan(0.5);
  });

  it('returns null when no result is within 200m', () => {
    const shop = makePass0Shop();
    const results = [
      makeApifyResult({
        location: { lat: 25.10, lng: 121.60 },
      }),
    ];

    expect(findBestMatch(shop, results)).toBeNull();
  });

  it('returns null when name overlap is below 50%', () => {
    const shop = makePass0Shop({ name: '完全不同的店名' });
    const results = [makeApifyResult({ title: 'Starbucks Reserve' })];

    expect(findBestMatch(shop, results)).toBeNull();
  });

  it('returns null for empty results array', () => {
    const shop = makePass0Shop();
    expect(findBestMatch(shop, [])).toBeNull();
  });

  it('excludes permanently closed places', () => {
    const shop = makePass0Shop();
    const results = [makeApifyResult({ permanentlyClosed: true })];

    expect(findBestMatch(shop, results)).toBeNull();
  });

  it('excludes temporarily closed places', () => {
    const shop = makePass0Shop();
    const results = [makeApifyResult({ temporarilyClosed: true })];

    expect(findBestMatch(shop, results)).toBeNull();
  });
});
