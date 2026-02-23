import { describe, it, expect } from 'vitest';
import {
  computeTagIdf,
  scoreTagDistinctiveness,
  inferModes,
} from './pass3c-postprocess';
import type { EnrichmentData } from './types';

// ─── Fixtures ──────────────────────────────────────────────────

function makeEnrichment(
  tagIds: string[],
  mode: EnrichmentData['mode'] = 'mixed'
): EnrichmentData {
  return {
    tags: tagIds.map((id) => ({ id, confidence: 0.8 })),
    summary: 'Test summary',
    topReviews: ['Review 1'],
    mode,
    enrichedAt: '2026-02-23T00:00:00Z',
    modelId: 'test-model',
  };
}

// ─── computeTagIdf ─────────────────────────────────────────────

describe('computeTagIdf', () => {
  it('computes higher IDF for rare tags', () => {
    const enrichments: EnrichmentData[] = [
      makeEnrichment(['common', 'rare']),
      makeEnrichment(['common']),
      makeEnrichment(['common']),
      makeEnrichment(['common']),
    ];

    const idf = computeTagIdf(enrichments);
    expect(idf.get('rare')!).toBeGreaterThan(idf.get('common')!);
  });

  it('computes IDF = log(N / df) for each tag', () => {
    const enrichments: EnrichmentData[] = [
      makeEnrichment(['a', 'b']),
      makeEnrichment(['a']),
    ];

    const idf = computeTagIdf(enrichments);
    // 'a' appears in 2/2 shops → log(2/2) = 0
    expect(idf.get('a')).toBeCloseTo(0, 2);
    // 'b' appears in 1/2 shops → log(2/1) ≈ 0.693
    expect(idf.get('b')).toBeCloseTo(Math.log(2), 2);
  });

  it('handles single-shop case without division by zero', () => {
    const enrichments: EnrichmentData[] = [makeEnrichment(['only_tag'])];

    const idf = computeTagIdf(enrichments);
    expect(idf.get('only_tag')).toBeCloseTo(0, 2);
  });
});

// ─── scoreTagDistinctiveness ──────────────────────────────────

describe('scoreTagDistinctiveness', () => {
  it('computes distinctiveness as confidence × idf', () => {
    const tags = [
      { id: 'rare', confidence: 0.9 },
      { id: 'common', confidence: 0.9 },
    ];
    const idf = new Map([
      ['rare', 2.0],
      ['common', 0.1],
    ]);

    const scored = scoreTagDistinctiveness(tags, idf);
    expect(scored[0].id).toBe('rare');
    expect(scored[0].distinctiveness).toBeCloseTo(1.8, 2); // 0.9 × 2.0
    expect(scored[1].id).toBe('common');
    expect(scored[1].distinctiveness).toBeCloseTo(0.09, 2); // 0.9 × 0.1
  });

  it('sorts tags by distinctiveness descending', () => {
    const tags = [
      { id: 'low', confidence: 0.5 },
      { id: 'high', confidence: 0.5 },
    ];
    const idf = new Map([
      ['low', 0.1],
      ['high', 2.0],
    ]);

    const scored = scoreTagDistinctiveness(tags, idf);
    expect(scored[0].id).toBe('high');
    expect(scored[1].id).toBe('low');
  });

  it('handles tags not in IDF map (distinctiveness = 0)', () => {
    const tags = [{ id: 'unknown', confidence: 0.9 }];
    const idf = new Map<string, number>();

    const scored = scoreTagDistinctiveness(tags, idf);
    expect(scored[0].distinctiveness).toBe(0);
  });
});
