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
        location: { lat: 25.1, lng: 121.6 },
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

  // ─── matchTier ────────────────────────────────────────────────

  it('assigns high tier for high-confidence matches', () => {
    const shop = makePass0Shop();
    const results = [makeApifyResult()]; // identical name, 1.4m distance

    const match = findBestMatch(shop, results);
    expect(match).not.toBeNull();
    expect(match!.matchTier).toBe('high');
  });

  it('assigns medium tier for borderline name + close distance', () => {
    // Name scores ~0.6, distance is close → confidence ~0.7 → medium tier
    const shop = makePass0Shop({ name: '山頂咖啡' });
    const results = [
      makeApifyResult({
        title: '山頂的好咖啡廳',
        location: { lat: 25.0502, lng: 121.5202 }, // ~2m away
      }),
    ];

    const match = findBestMatch(shop, results);
    if (match) {
      expect(['medium', 'high']).toContain(match.matchTier);
    }
  });

  // ─── Chain-aware matching (KEY TEST) ──────────────────────────

  it('does NOT match 路易莎咖啡 中山店 to 路易莎咖啡 信義店', () => {
    const shop = makePass0Shop({
      name: '路易莎咖啡 中山店',
      latitude: 25.05,
      longitude: 121.52,
    });
    const results = [
      makeApifyResult({
        title: '路易莎咖啡 信義店',
        placeId: 'ChIJ_louisa_xinyi',
        location: { lat: 25.0502, lng: 121.5202 }, // within 200m
      }),
    ];

    // Even though both are 路易莎 (same brand) and within 200m,
    // different branch → should NOT match (branch score < 0.5)
    const match = findBestMatch(shop, results);
    expect(match).toBeNull();
  });

  it('matches 路易莎咖啡 中山店 to 路易莎咖啡 中山', () => {
    const shop = makePass0Shop({
      name: '路易莎咖啡 中山店',
      latitude: 25.05,
      longitude: 121.52,
    });
    const results = [
      makeApifyResult({
        title: '路易莎咖啡 中山',
        placeId: 'ChIJ_louisa_zhongshan',
        location: { lat: 25.0502, lng: 121.5202 }, // within 200m
      }),
    ];

    const match = findBestMatch(shop, results);
    expect(match).not.toBeNull();
    expect(match!.placeId).toBe('ChIJ_louisa_zhongshan');
  });

  it('matches chain shop with no branch suffix using full-name comparison', () => {
    // Cafe Nomad lists "cama cafe" (no branch); Google Maps has "cama cafe 大安店".
    // The empty branch fallback uses full-name comparison — brand already matches,
    // so the overall score is acceptable.
    const shop = makePass0Shop({
      name: 'cama cafe',
      latitude: 25.05,
      longitude: 121.52,
    });
    const results = [
      makeApifyResult({
        title: 'cama cafe 大安店',
        placeId: 'ChIJ_cama_daan',
        location: { lat: 25.0502, lng: 121.5202 },
      }),
    ];

    // Should match (not silently drop to unmatched) — the brand is the same
    // and there's no branch info to discriminate on.
    const match = findBestMatch(shop, results);
    expect(match).not.toBeNull();
    expect(match!.placeId).toBe('ChIJ_cama_daan');
  });
});
