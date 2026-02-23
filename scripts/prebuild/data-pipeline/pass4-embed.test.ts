import { describe, it, expect } from 'vitest';
import { composeEmbeddingText } from './pass4-embed';
import type { EnrichedShop, TaxonomyTag } from './types';

// ─── Fixtures ──────────────────────────────────────────────────

const taxonomy: TaxonomyTag[] = [
  { id: 'has_outlets', dimension: 'functionality', label: 'Has outlets', labelZh: '有插座' },
  { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' },
];

function makeEnrichedShop(overrides: Partial<EnrichedShop> = {}): EnrichedShop {
  return {
    cafenomad_id: 'test-id',
    google_place_id: 'test-place',
    match_confidence: 1,
    name: 'Test Cafe 測試咖啡',
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
    price_range: '$200-400',
    description: null,
    menu_url: null,
    limited_time: 'no',
    socket: 'yes',
    social_url: '',
    reviews: [],
    photos: [],
    enrichment: {
      tags: [
        { id: 'has_outlets', confidence: 0.9 },
        { id: 'quiet', confidence: 0.7 },
      ],
      summary: 'A quiet cafe with outlets perfect for working.',
      topReviews: ['很安靜適合工作', '咖啡很好喝，環境舒適'],
      mode: 'work',
      enrichedAt: '2026-02-23T00:00:00Z',
      modelId: 'test-model',
    },
    ...overrides,
  };
}

// ─── composeEmbeddingText ──────────────────────────────────────

describe('composeEmbeddingText', () => {
  it('includes name, summary, tags, and reviews in correct order', () => {
    const text = composeEmbeddingText(makeEnrichedShop(), taxonomy);
    const nameIdx = text.indexOf('Test Cafe 測試咖啡');
    const summaryIdx = text.indexOf('A quiet cafe with outlets');
    const tagsIdx = text.indexOf('Tags:');
    const reviewsIdx = text.indexOf('Selected reviews:');

    expect(nameIdx).toBeLessThan(summaryIdx);
    expect(summaryIdx).toBeLessThan(tagsIdx);
    expect(tagsIdx).toBeLessThan(reviewsIdx);
  });

  it('resolves tag IDs to labels', () => {
    const text = composeEmbeddingText(makeEnrichedShop(), taxonomy);
    expect(text).toContain('Has outlets');
    expect(text).toContain('有插座');
    expect(text).toContain('Quiet');
    expect(text).toContain('安靜');
  });

  it('handles shops with no tags gracefully', () => {
    const shop = makeEnrichedShop({
      enrichment: {
        ...makeEnrichedShop().enrichment,
        tags: [],
      },
    });
    const text = composeEmbeddingText(shop, taxonomy);
    expect(text).toContain('Test Cafe');
    expect(text).toContain('Tags:');
  });

  it('handles shops with empty topReviews', () => {
    const shop = makeEnrichedShop({
      enrichment: {
        ...makeEnrichedShop().enrichment,
        topReviews: [],
      },
    });
    const text = composeEmbeddingText(shop, taxonomy);
    expect(text).toContain('Test Cafe');
    expect(text).not.toContain('undefined');
  });
});
