import { haversineDistanceM } from './filters';
import type { Pass0Shop, ApifyPlaceResult } from '../types';

// ─── Constants ─────────────────────────────────────────────────

/** Maximum distance (meters) for a match to be considered valid */
const MAX_MATCH_DISTANCE_M = 200;

/** Minimum name similarity score (0-1) for a match */
const MIN_NAME_SCORE = 0.5;

// ─── Types ─────────────────────────────────────────────────────

export interface MatchResult {
  placeId: string;
  confidence: number;
  distanceM: number;
  nameScore: number;
}

// ─── Fuzzy Name Matching ───────────────────────────────────────

/**
 * Computes a character-overlap similarity score between two names.
 * Returns 0.0 (no overlap) to 1.0 (identical after normalization).
 *
 * Algorithm: Sørensen-Dice coefficient on character sets (after normalizing
 * whitespace and lowercasing). Works well for CJK + Latin mixed names,
 * and scores substring relationships higher than pure Jaccard.
 */
export function fuzzyNameScore(a: string, b: string): number {
  const normalize = (s: string) =>
    s.replace(/\s+/g, '').toLowerCase();

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;
  if (na.length === 0 || nb.length === 0) return 0.0;

  const setA = new Set(na);
  const setB = new Set(nb);

  let intersection = 0;
  for (const ch of setA) {
    if (setB.has(ch)) intersection++;
  }

  if (intersection === 0) return 0.0;

  return (2 * intersection) / (setA.size + setB.size);
}

// ─── Match Logic ───────────────────────────────────────────────

/**
 * Finds the best Google Maps match for a Cafe Nomad shop.
 * Returns null if no result passes the distance + name thresholds.
 */
export function findBestMatch(
  shop: Pass0Shop,
  results: ApifyPlaceResult[]
): MatchResult | null {
  let best: MatchResult | null = null;

  for (const result of results) {
    if (result.permanentlyClosed || result.temporarilyClosed) continue;

    const distanceM = haversineDistanceM(
      shop.latitude,
      shop.longitude,
      result.location.lat,
      result.location.lng
    );

    if (distanceM > MAX_MATCH_DISTANCE_M) continue;

    const nameScore = fuzzyNameScore(shop.name, result.title);
    if (nameScore < MIN_NAME_SCORE) continue;

    const distanceScore = 1 - distanceM / MAX_MATCH_DISTANCE_M;
    const confidence = nameScore * 0.6 + distanceScore * 0.4;

    if (!best || confidence > best.confidence) {
      best = {
        placeId: result.placeId,
        confidence,
        distanceM,
        nameScore,
      };
    }
  }

  return best;
}
