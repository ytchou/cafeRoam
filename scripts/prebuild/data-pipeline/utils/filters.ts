import type { CafeNomadEntry } from '../types';

// ─── Constants ─────────────────────────────────────────────────

const CLOSED_KEYWORDS = ['已歇業', '暫停營業', '已關', '已結束'];

/** Greater Taipei bounding box */
const TAIPEI_BOUNDS = {
  lat: { min: 24.95, max: 25.22 },
  lng: { min: 121.40, max: 121.65 },
} as const;

/** Maximum distance (meters) for two shops to be considered duplicates */
const DUPLICATE_RADIUS_M = 50;

// ─── Filter Functions ──────────────────────────────────────────

/** Returns true if the shop name contains known-closed keywords */
export function isKnownClosed(name: string): boolean {
  return CLOSED_KEYWORDS.some((kw) => name.includes(kw));
}

/** Returns true if the entry is missing critical fields */
export function isShellEntry(entry: CafeNomadEntry): boolean {
  if (!entry.name || !entry.address || !entry.latitude || !entry.longitude) {
    return true;
  }
  const lat = parseFloat(entry.latitude);
  const lng = parseFloat(entry.longitude);
  if (lat === 0 || lng === 0) {
    return true;
  }
  return false;
}

/** Returns true if coordinates fall outside greater Taipei */
export function isOutOfBounds(lat: number, lng: number): boolean {
  return (
    lat < TAIPEI_BOUNDS.lat.min ||
    lat > TAIPEI_BOUNDS.lat.max ||
    lng < TAIPEI_BOUNDS.lng.min ||
    lng > TAIPEI_BOUNDS.lng.max
  );
}

/**
 * Finds duplicate shops: same name within DUPLICATE_RADIUS_M meters.
 * Returns a Set of cafenomad_ids to remove (keeps the first occurrence).
 */
export function findDuplicates(
  shops: { name: string; latitude: number; longitude: number; cafenomad_id: string }[]
): Set<string> {
  const duplicateIds = new Set<string>();

  for (let i = 0; i < shops.length; i++) {
    if (duplicateIds.has(shops[i].cafenomad_id)) continue;

    for (let j = i + 1; j < shops.length; j++) {
      if (duplicateIds.has(shops[j].cafenomad_id)) continue;

      if (
        shops[i].name === shops[j].name &&
        haversineDistanceM(
          shops[i].latitude,
          shops[i].longitude,
          shops[j].latitude,
          shops[j].longitude
        ) <= DUPLICATE_RADIUS_M
      ) {
        duplicateIds.add(shops[j].cafenomad_id);
      }
    }
  }

  return duplicateIds;
}

// ─── Geo Helpers ───────────────────────────────────────────────

/** Haversine distance between two coordinates in meters */
export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
