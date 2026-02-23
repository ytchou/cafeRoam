import { token_set_ratio } from 'fuzzball';
import { haversineDistanceM } from './filters';
import { normalizeName } from './name-normalizer';
import { detectChain, decomposeBrandBranch } from './chain-dictionary';
import type { Pass0Shop, ApifyPlaceResult } from '../types';

// ─── Constants ─────────────────────────────────────────────────

/** Maximum distance (meters) for a match to be considered valid */
const MAX_MATCH_DISTANCE_M = 200;

/** Minimum name similarity score (0-1) for a match */
const MIN_NAME_SCORE = 0.5;

/** fuzzball options — MUST disable force_ascii to preserve CJK characters */
const FUZZ_OPTIONS = { force_ascii: false, full_process: false } as const;

// ─── Types ─────────────────────────────────────────────────────

export type MatchTier = 'high' | 'medium' | 'low';

export interface MatchResult {
  placeId: string;
  confidence: number;
  distanceM: number;
  nameScore: number;
  matchTier: MatchTier;
}

// ─── Helpers ───────────────────────────────────────────────────

function confidenceToTier(confidence: number): MatchTier {
  if (confidence >= 0.75) return 'high';
  if (confidence >= 0.50) return 'medium';
  return 'low';
}

// ─── Fuzzy Name Matching ───────────────────────────────────────

/**
 * Computes a name similarity score between two shop names.
 * Returns 0.0 (no overlap) to 1.0 (identical after normalization).
 *
 * Algorithm: fuzzball token_set_ratio on normalized names.
 * token_set_ratio handles:
 *   - Token reordering: "中山好咖啡" vs "好咖啡中山店"
 *   - Subset matching: "好咖啡" vs "好咖啡 中山店"
 *   - Mixed CJK+Latin: "cama cafe 中山" vs "cama 中山"
 *
 * IMPORTANT: force_ascii: false is required — the default (true) strips
 * all non-ASCII characters, destroying CJK input.
 *
 * Spaces are preserved when passed to token_set_ratio so the tokenizer
 * can split on them. The identity check uses space-stripped versions to
 * treat "好 咖啡" and "好咖啡" as equal.
 */
export function fuzzyNameScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  // Treat names as identical when they differ only by internal whitespace.
  // This is checked separately so that spaces are still present when
  // token_set_ratio tokenizes (preserving its subset/reorder advantage).
  if (na.replace(/\s+/g, '') === nb.replace(/\s+/g, '')) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0.0;

  return token_set_ratio(na, nb, FUZZ_OPTIONS) / 100;
}

// ─── Match Logic ───────────────────────────────────────────────

/**
 * Finds the best Google Maps match for a Cafe Nomad shop.
 * Returns null if no result passes the distance + name thresholds.
 *
 * Chain-aware: for known Taiwan coffee chains (路易莎, 星巴克, etc.),
 * requires brand to match before scoring on branch similarity.
 * This prevents cross-branch false positives (e.g., 路易莎 中山店
 * matching 路易莎 信義店 when both are within 200m).
 */
export function findBestMatch(
  shop: Pass0Shop,
  results: ApifyPlaceResult[]
): MatchResult | null {
  let best: MatchResult | null = null;

  const shopChain = detectChain(shop.name);
  const shopDecomposed = shopChain ? decomposeBrandBranch(shop.name) : null;

  for (const result of results) {
    if (result.permanentlyClosed || result.temporarilyClosed) continue;

    const distanceM = haversineDistanceM(
      shop.latitude,
      shop.longitude,
      result.location.lat,
      result.location.lng
    );

    if (distanceM > MAX_MATCH_DISTANCE_M) continue;

    let nameScore: number;

    if (shopChain && shopDecomposed) {
      // Chain-aware matching: require brand match, score on branch
      const resultChain = detectChain(result.title);
      if (!resultChain || resultChain.brand !== shopChain.brand) continue;

      const resultDecomposed = decomposeBrandBranch(result.title);
      const shopBranch = shopDecomposed.branch || shopDecomposed.brand;
      const resultBranch = resultDecomposed?.branch || resultDecomposed?.brand || result.title;

      nameScore = fuzzyNameScore(shopBranch, resultBranch);
    } else {
      nameScore = fuzzyNameScore(shop.name, result.title);
    }

    if (nameScore < MIN_NAME_SCORE) continue;

    const distanceScore = 1 - distanceM / MAX_MATCH_DISTANCE_M;
    const confidence = nameScore * 0.6 + distanceScore * 0.4;

    if (!best || confidence > best.confidence) {
      best = {
        placeId: result.placeId,
        confidence,
        distanceM,
        nameScore,
        matchTier: confidenceToTier(confidence),
      };
    }
  }

  return best;
}
