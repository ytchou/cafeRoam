// ─── Noise Suffixes ────────────────────────────────────────────

/**
 * Suffixes stripped from shop names before matching.
 * Ordered longest-first so we strip the most specific suffix.
 * Does NOT strip standalone 咖啡 (could be the entire name)
 * or standalone 店 (damages branch names like 中山店).
 */
const NOISE_SUFFIXES = [
  '咖啡蛋糕烘焙專賣店',
  '咖啡烘焙專賣店',
  '咖啡專賣店',
  '咖啡工作室',
  '咖啡館',
  '咖啡店',
  '咖啡廳',
  '門市',
  '分店',
  'coffee shop',
  'cafe',
] as const;

// ─── Full-Width → Half-Width ────────────────────────────────────

/**
 * Converts full-width ASCII characters (U+FF01–U+FF5E) to their
 * half-width equivalents (U+0021–U+007E).
 */
function fullWidthToHalf(s: string): string {
  return s.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
}

// ─── Exported API ──────────────────────────────────────────────

/**
 * Normalizes a coffee shop name for fuzzy matching:
 * 1. Full-width → half-width
 * 2. Lowercase
 * 3. Collapse whitespace + trim
 * 4. Strip noise suffixes (longest-match first, only if name is longer than suffix)
 */
export function normalizeName(name: string): string {
  let s = fullWidthToHalf(name);
  s = s.toLowerCase();
  s = s.replace(/\s+/g, ' ').trim();

  for (const suffix of NOISE_SUFFIXES) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      s = s.slice(0, s.length - suffix.length).trim();
      break;
    }
  }

  return s;
}
