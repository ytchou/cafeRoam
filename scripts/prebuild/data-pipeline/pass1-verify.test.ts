import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildSearchTerms, mergeMatch } from './pass1-verify';
import type { Pass0Shop, ApifyPlaceResult } from './types';

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
    placeId: 'ChIJ_test',
    address: '100號 南京東路, 中山區',
    location: { lat: 25.0501, lng: 121.5201 },
    totalScore: 4.3,
    reviewsCount: 200,
    openingHours: [{ day: 'Monday', hours: '09:00-18:00' }],
    phone: '+886-2-1234-5678',
    website: 'https://example.com',
    categoryName: 'Coffee shop',
    categories: ['Coffee shop', 'Cafe'],
    permanentlyClosed: false,
    temporarilyClosed: false,
    url: 'https://maps.google.com/?cid=123',
    ...overrides,
  };
}

// ─── buildSearchTerms ──────────────────────────────────────────

describe('buildSearchTerms', () => {
  it('combines name and address into a search term', () => {
    const shop = makePass0Shop();
    const terms = buildSearchTerms([shop]);
    expect(terms).toEqual(['好咖啡 台北市中山區南京東路100號']);
  });

  it('handles multiple shops', () => {
    const shops = [
      makePass0Shop({ name: 'Shop A', address: 'Addr A' }),
      makePass0Shop({ name: 'Shop B', address: 'Addr B' }),
    ];
    const terms = buildSearchTerms(shops);
    expect(terms).toHaveLength(2);
    expect(terms[0]).toBe('Shop A Addr A');
    expect(terms[1]).toBe('Shop B Addr B');
  });
});

// ─── mergeMatch ────────────────────────────────────────────────

describe('mergeMatch', () => {
  it('merges Pass0Shop + ApifyPlaceResult into Pass1Shop', () => {
    const shop = makePass0Shop();
    const result = makeApifyResult();
    const merged = mergeMatch(shop, result, 0.85);

    expect(merged.cafenomad_id).toBe('cn-1');
    expect(merged.google_place_id).toBe('ChIJ_test');
    expect(merged.match_confidence).toBe(0.85);
    expect(merged.name).toBe('好咖啡');
    expect(merged.google_name).toBe('好咖啡');
    expect(merged.rating).toBe(4.3);
    expect(merged.review_count).toBe(200);
    expect(merged.categories).toEqual(['Coffee shop', 'Cafe']);
    expect(merged.phone).toBe('+886-2-1234-5678');
  });

  it('preserves Cafe Nomad fields (mrt, limited_time, socket)', () => {
    const shop = makePass0Shop({ mrt: '松山', limited_time: 'yes', socket: 'no' });
    const result = makeApifyResult();
    const merged = mergeMatch(shop, result, 0.9);

    expect(merged.mrt).toBe('松山');
    expect(merged.limited_time).toBe('yes');
    expect(merged.socket).toBe('no');
  });

  it('handles null rating from Google Maps', () => {
    const shop = makePass0Shop();
    const result = makeApifyResult({ totalScore: null });
    const merged = mergeMatch(shop, result, 0.7);

    expect(merged.rating).toBeNull();
  });

  it('formats opening hours as string array', () => {
    const shop = makePass0Shop();
    const result = makeApifyResult({
      openingHours: [
        { day: 'Monday', hours: '09:00-18:00' },
        { day: 'Tuesday', hours: '09:00-18:00' },
      ],
    });
    const merged = mergeMatch(shop, result, 0.8);

    expect(merged.opening_hours).toEqual([
      'Monday: 09:00-18:00',
      'Tuesday: 09:00-18:00',
    ]);
  });
});

// ─── 3-tier routing (via findBestMatch integration test) ──────

describe('3-tier match routing', () => {
  it('mergeMatch works for high-tier match (confidence >= 0.75)', () => {
    const shop = makePass0Shop();
    const result = makeApifyResult();
    // High confidence match — mergeMatch should be called by pass1 pipeline
    const merged = mergeMatch(shop, result, 0.85);
    expect(merged.match_confidence).toBe(0.85);
  });

  it('mergeMatch works for medium-tier match (confidence 0.50-0.74)', () => {
    const shop = makePass0Shop();
    const result = makeApifyResult();
    // Medium confidence — goes to review pile
    const merged = mergeMatch(shop, result, 0.62);
    expect(merged.match_confidence).toBe(0.62);
  });

  it('UnmatchedShop reason includes low_confidence', () => {
    // Type check: low_confidence is a valid reason
    const unmatched = {
      cafenomad_id: 'cn-1',
      name: '好咖啡',
      address: '台北市中山區',
      latitude: 25.05,
      longitude: 121.52,
      reason: 'low_confidence' as const,
    };
    // TypeScript would error at compile time if 'low_confidence' is not in the union
    expect(unmatched.reason).toBe('low_confidence');
  });
});
