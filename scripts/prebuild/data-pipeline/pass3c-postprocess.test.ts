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

  it('counts document frequency per shop, not per tag occurrence (no negative IDF)', () => {
    // Shop 1 has duplicate tag IDs (e.g., LLM returned same tag twice at different confidence)
    const enrichments: EnrichmentData[] = [
      {
        tags: [
          { id: 'cozy', confidence: 0.9 },
          { id: 'cozy', confidence: 0.7 }, // duplicate
        ],
        summary: 'Test',
        topReviews: [],
        mode: 'rest',
        enrichedAt: '2026-02-23T00:00:00Z',
        modelId: 'test-model',
      },
      makeEnrichment(['cozy']),
    ];

    const idf = computeTagIdf(enrichments);
    // 'cozy' appears in 2/2 shops → idf should be 0, never negative
    expect(idf.get('cozy')).toBeGreaterThanOrEqual(0);
    expect(idf.get('cozy')).toBeCloseTo(0, 2);
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

// ─── inferModes ────────────────────────────────────────────────

describe('inferModes', () => {
  it('infers work mode from work signal tags', () => {
    const tags = [
      { id: 'deep_work', confidence: 0.9 },
      { id: 'power_outlets', confidence: 0.8 },
    ];
    const modes = inferModes(tags, 'mixed');
    expect(modes).toContain('work');
  });

  it('infers multiple modes when signals overlap', () => {
    const tags = [
      { id: 'deep_work', confidence: 0.9 },
      { id: 'catch_up_friends', confidence: 0.7 },
      { id: 'specialty_coffee_focused', confidence: 0.8 },
    ];
    const modes = inferModes(tags, 'mixed');
    expect(modes).toContain('work');
    expect(modes).toContain('social');
    expect(modes).toContain('coffee');
  });

  it('ignores signal tags below confidence threshold', () => {
    const tags = [
      { id: 'deep_work', confidence: 0.3 }, // below 0.5 threshold
      { id: 'catch_up_friends', confidence: 0.7 },
    ];
    const modes = inferModes(tags, 'mixed');
    expect(modes).not.toContain('work');
    expect(modes).toContain('social');
  });

  it('falls back to original mode when no signals match', () => {
    const tags = [{ id: 'some_unrelated_tag', confidence: 0.9 }];
    const modes = inferModes(tags, 'social');
    expect(modes).toEqual(['social']);
  });

  it('falls back to rest when original mode is mixed and no signals match', () => {
    const tags = [{ id: 'some_unrelated_tag', confidence: 0.9 }];
    const modes = inferModes(tags, 'mixed');
    expect(modes).toEqual(['rest']);
  });

  it('returns modes in consistent order: work, rest, social, coffee', () => {
    const tags = [
      { id: 'specialty_coffee_focused', confidence: 0.8 },
      { id: 'deep_work', confidence: 0.9 },
      { id: 'quiet', confidence: 0.7 },
      { id: 'catch_up_friends', confidence: 0.6 },
    ];
    const modes = inferModes(tags, 'mixed');
    // Order follows MODE_SIGNALS iteration: work, rest, social, coffee
    expect(modes).toEqual(['work', 'rest', 'social', 'coffee']);
  });
});
