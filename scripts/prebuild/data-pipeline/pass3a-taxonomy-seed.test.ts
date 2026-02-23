import { describe, it, expect } from 'vitest';
import { sampleReviews, flattenProposalToTags } from './pass3a-taxonomy-seed';
import type { Pass2Shop, TaxonomyProposal } from './types';

// ─── Fixtures ──────────────────────────────────────────────────

function makeShop(overrides: Partial<Pass2Shop> = {}): Pass2Shop {
  return {
    cafenomad_id: 'test-id',
    google_place_id: 'test-place',
    match_confidence: 1,
    name: 'Test Cafe',
    address: '台北市',
    latitude: 25.04,
    longitude: 121.54,
    mrt: '',
    rating: 4.5,
    review_count: 10,
    opening_hours: null,
    phone: null,
    website: null,
    categories: ['咖啡廳'],
    price_range: null,
    description: null,
    menu_url: null,
    limited_time: '',
    socket: '',
    social_url: '',
    reviews: [],
    photos: [],
    ...overrides,
  };
}

// ─── sampleReviews ─────────────────────────────────────────────

describe('sampleReviews', () => {
  it('selects top N reviews by text length from each shop', () => {
    const shop = makeShop({
      reviews: [
        { text: 'short', stars: 5, published_at: '', language: 'unknown' },
        { text: 'this is a much longer review with details', stars: 4, published_at: '', language: 'unknown' },
        { text: 'medium length review', stars: 3, published_at: '', language: 'unknown' },
      ],
    });

    const result = sampleReviews([shop], 2);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('this is a much longer review with details');
    expect(result[1]).toBe('medium length review');
  });

  it('skips empty reviews', () => {
    const shop = makeShop({
      reviews: [
        { text: '', stars: 5, published_at: '', language: 'unknown' },
        { text: '  ', stars: 4, published_at: '', language: 'unknown' },
        { text: 'actual review text', stars: 3, published_at: '', language: 'unknown' },
      ],
    });

    const result = sampleReviews([shop], 2);
    expect(result).toEqual(['actual review text']);
  });

  it('handles shops with fewer reviews than perShop', () => {
    const shop = makeShop({
      reviews: [
        { text: 'only one review', stars: 5, published_at: '', language: 'unknown' },
      ],
    });

    const result = sampleReviews([shop], 3);
    expect(result).toEqual(['only one review']);
  });

  it('samples from multiple shops', () => {
    const shop1 = makeShop({
      name: 'Shop A',
      reviews: [
        { text: 'review from shop A', stars: 5, published_at: '', language: 'unknown' },
      ],
    });
    const shop2 = makeShop({
      name: 'Shop B',
      reviews: [
        { text: 'review from shop B', stars: 4, published_at: '', language: 'unknown' },
      ],
    });

    const result = sampleReviews([shop1, shop2], 1);
    expect(result).toHaveLength(2);
    expect(result).toContain('review from shop A');
    expect(result).toContain('review from shop B');
  });
});

// ─── flattenProposalToTags ─────────────────────────────────────

describe('flattenProposalToTags', () => {
  it('flattens all dimensions into a single TaxonomyTag array', () => {
    const proposal: TaxonomyProposal = {
      functionality: [{ id: 'has_outlets', label: 'Has outlets', labelZh: '有插座' }],
      time: [{ id: 'late_night', label: 'Late night', labelZh: '深夜營業' }],
      ambience: [{ id: 'quiet', label: 'Quiet', labelZh: '安靜' }],
      mode: [{ id: 'deep_work', label: 'Deep work', labelZh: '專注工作' }],
    };

    const tags = flattenProposalToTags(proposal);
    expect(tags).toHaveLength(4);
    expect(tags[0]).toEqual({ id: 'has_outlets', dimension: 'functionality', label: 'Has outlets', labelZh: '有插座' });
    expect(tags[1]).toEqual({ id: 'late_night', dimension: 'time', label: 'Late night', labelZh: '深夜營業' });
    expect(tags[2]).toEqual({ id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' });
    expect(tags[3]).toEqual({ id: 'deep_work', dimension: 'mode', label: 'Deep work', labelZh: '專注工作' });
  });
});
