import { describe, it, expect } from 'vitest';
import { computeTaxonomyBoost, rankResults } from './pass5-search-test';
import type { TaxonomyTag } from './types';

// ─── Fixtures ──────────────────────────────────────────────────

const taxonomy: TaxonomyTag[] = [
  { id: 'has_outlets', dimension: 'functionality', label: 'Has outlets', labelZh: '有插座' },
  { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' },
  { id: 'late_night', dimension: 'time', label: 'Late night', labelZh: '深夜營業' },
];

const shopTags = [
  { id: 'has_outlets', confidence: 0.9 },
  { id: 'quiet', confidence: 0.7 },
];

// ─── computeTaxonomyBoost ──────────────────────────────────────

describe('computeTaxonomyBoost', () => {
  it('returns boost for Chinese label match', () => {
    const result = computeTaxonomyBoost('有插座的咖啡廳', shopTags, taxonomy);
    expect(result.boost).toBeGreaterThan(0);
    expect(result.matchedTags).toContain('has_outlets');
  });

  it('returns boost for English label match (case-insensitive)', () => {
    const result = computeTaxonomyBoost('a quiet cafe', shopTags, taxonomy);
    expect(result.boost).toBeGreaterThan(0);
    expect(result.matchedTags).toContain('quiet');
  });

  it('returns 0 boost when no tags match', () => {
    const result = computeTaxonomyBoost('好喝的拿鐵', shopTags, taxonomy);
    expect(result.boost).toBe(0);
    expect(result.matchedTags).toHaveLength(0);
  });

  it('accumulates boost for multiple matches', () => {
    const result = computeTaxonomyBoost('安靜有插座', shopTags, taxonomy);
    expect(result.matchedTags).toHaveLength(2);
    expect(result.boost).toBeGreaterThan(
      computeTaxonomyBoost('安靜', shopTags, taxonomy).boost
    );
  });

  it('only matches tags the shop actually has', () => {
    // query mentions late_night but shop doesn't have that tag
    const result = computeTaxonomyBoost('深夜營業', shopTags, taxonomy);
    expect(result.matchedTags).toHaveLength(0);
    expect(result.boost).toBe(0);
  });
});

// ─── rankResults ───────────────────────────────────────────────

describe('rankResults', () => {
  const mockEmbeddings: Array<{ name: string; score: number; shopTags: Array<{ id: string; confidence: number }> }> = [
    { name: 'Shop A', score: 0.8, shopTags: [{ id: 'has_outlets', confidence: 0.9 }] },
    { name: 'Shop B', score: 0.85, shopTags: [{ id: 'quiet', confidence: 0.7 }] },
    { name: 'Shop C', score: 0.7, shopTags: [{ id: 'has_outlets', confidence: 0.9 }, { id: 'quiet', confidence: 0.7 }] },
  ];

  it('ranks by boosted score descending', () => {
    // Query matches 'quiet' — Shop B and Shop C get boost
    const results = rankResults('安靜的咖啡廳', mockEmbeddings, taxonomy);
    // Shop B: 0.85 + boost, Shop A: 0.8, Shop C: 0.7 + boost
    expect(results[0].name).toBe('Shop B');
  });

  it('includes matched tags in results', () => {
    const results = rankResults('安靜的咖啡廳', mockEmbeddings, taxonomy);
    const shopB = results.find((r) => r.name === 'Shop B');
    expect(shopB?.matchedTags).toContain('quiet');
  });

  it('returns results with rank numbers starting at 1', () => {
    const results = rankResults('test', mockEmbeddings, taxonomy);
    expect(results[0].rank).toBe(1);
    expect(results[1].rank).toBe(2);
    expect(results[2].rank).toBe(3);
  });
});
