import { describe, it, expect } from 'vitest';
import {
  buildEnrichmentPrompt,
  validateEnrichmentResult,
  parseCliArgs,
} from './pass3b-enrich';
import type { Pass2Shop, TaxonomyTag, EnrichmentData } from './types';

// ─── Fixtures ──────────────────────────────────────────────────

const taxonomy: TaxonomyTag[] = [
  { id: 'has_outlets', dimension: 'functionality', label: 'Has outlets', labelZh: '有插座' },
  { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' },
  { id: 'deep_work', dimension: 'mode', label: 'Deep work', labelZh: '專注工作' },
];

function makeShop(overrides: Partial<Pass2Shop> = {}): Pass2Shop {
  return {
    cafenomad_id: 'test-id',
    google_place_id: 'test-place',
    match_confidence: 1,
    name: 'Test Cafe 測試咖啡',
    address: '台北市',
    latitude: 25.04,
    longitude: 121.54,
    mrt: '國父紀念館',
    rating: 4.5,
    review_count: 10,
    opening_hours: null,
    phone: null,
    website: null,
    categories: ['咖啡廳', '咖啡烘焙商'],
    price_range: '$200-400',
    description: null,
    menu_url: null,
    limited_time: 'no',
    socket: 'yes',
    social_url: '',
    reviews: [
      { text: '很安靜適合工作', stars: 5, published_at: '3 個月前', language: 'unknown' },
      { text: '', stars: 4, published_at: '1 年前', language: 'unknown' },
      { text: '咖啡很好喝', stars: 5, published_at: '6 個月前', language: 'unknown' },
    ],
    photos: [],
    ...overrides,
  };
}

// ─── buildEnrichmentPrompt ─────────────────────────────────────

describe('buildEnrichmentPrompt', () => {
  it('includes shop name and categories', () => {
    const prompt = buildEnrichmentPrompt(makeShop(), taxonomy);
    expect(prompt).toContain('Test Cafe 測試咖啡');
    expect(prompt).toContain('咖啡廳');
    expect(prompt).toContain('咖啡烘焙商');
  });

  it('includes only non-empty reviews', () => {
    const prompt = buildEnrichmentPrompt(makeShop(), taxonomy);
    expect(prompt).toContain('很安靜適合工作');
    expect(prompt).toContain('咖啡很好喝');
    expect(prompt).not.toMatch(/\[\d+\]\s*\n/); // no empty review entries
  });

  it('includes existing attributes (socket, limited_time)', () => {
    const prompt = buildEnrichmentPrompt(makeShop(), taxonomy);
    expect(prompt).toContain('Socket: yes');
    expect(prompt).toContain('Limited time: no');
  });

  it('includes taxonomy tag IDs for reference', () => {
    const prompt = buildEnrichmentPrompt(makeShop(), taxonomy);
    expect(prompt).toContain('has_outlets');
    expect(prompt).toContain('quiet');
    expect(prompt).toContain('deep_work');
  });
});

// ─── validateEnrichmentResult ──────────────────────────────────

describe('validateEnrichmentResult', () => {
  const validResult: EnrichmentData = {
    tags: [{ id: 'has_outlets', confidence: 0.9 }, { id: 'quiet', confidence: 0.7 }],
    summary: 'A quiet cafe with outlets, perfect for working.',
    topReviews: ['很安靜適合工作'],
    mode: 'work',
    enrichedAt: new Date().toISOString(),
    modelId: 'claude-sonnet-4-6-20250514',
  };

  it('accepts valid enrichment result', () => {
    expect(validateEnrichmentResult(validResult, taxonomy)).toEqual(validResult);
  });

  it('filters out unknown tag IDs', () => {
    const withUnknown = {
      ...validResult,
      tags: [...validResult.tags, { id: 'nonexistent_tag', confidence: 0.8 }],
    };
    const result = validateEnrichmentResult(withUnknown, taxonomy);
    expect(result.tags).toHaveLength(2);
    expect(result.tags.every((t) => taxonomy.some((tx) => tx.id === t.id))).toBe(true);
  });

  it('clamps confidence to [0, 1] range', () => {
    const withBadConfidence = {
      ...validResult,
      tags: [{ id: 'has_outlets', confidence: 1.5 }, { id: 'quiet', confidence: -0.2 }],
    };
    const result = validateEnrichmentResult(withBadConfidence, taxonomy);
    expect(result.tags[0].confidence).toBe(1.0);
    expect(result.tags[1].confidence).toBe(0.0);
  });

  it('validates mode is one of the allowed values', () => {
    const withBadMode = { ...validResult, mode: 'invalid' as EnrichmentData['mode'] };
    const result = validateEnrichmentResult(withBadMode, taxonomy);
    expect(result.mode).toBe('mixed'); // fallback
  });
});

// ─── parseCliArgs ──────────────────────────────────────────────

describe('parseCliArgs', () => {
  it('returns defaults when no args provided', () => {
    const args = parseCliArgs([]);
    expect(args.model).toBe('sonnet');
    expect(args.startFrom).toBe(0);
    expect(args.dryRun).toBe(false);
  });

  it('parses --model flag', () => {
    const args = parseCliArgs(['--model', 'haiku']);
    expect(args.model).toBe('haiku');
  });

  it('parses --dry-run flag', () => {
    const args = parseCliArgs(['--dry-run']);
    expect(args.dryRun).toBe(true);
  });

  it('parses --start-from flag', () => {
    const args = parseCliArgs(['--start-from', '5']);
    expect(args.startFrom).toBe(5);
  });
});
