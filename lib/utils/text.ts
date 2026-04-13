/**
 * Text utilities for shop data normalization.
 */

// SEO noise patterns that should be stripped from shop names
const SEO_NOISE_PATTERNS = [
  /\(完整菜單[^)]*\)/gi,  // 完整菜單可點instagram, etc.
  /\(菜單[^)]*\)/gi,      // 菜單/menu/IG, etc.
  /\(wifi[^)]*\)/gi,      // wifi/插座/不限時, etc.
  /\(menu[^)]*\)/gi,      // menu links
  /\(IG[^)]*\)/gi,        // IG links
  /\(instagram[^)]*\)/gi, // instagram links
  /\([^)]*\/[^)]*\)/gi,   // anything with / inside (wifi/插座, 菜單/menu, etc.)
]

/**
 * Normalize a shop name by stripping SEO noise from Google Maps.
 *
 * Strips trailing parenthetical content that looks like SEO keywords
 * (e.g., "(完整菜單可點instagram)", "(wifi/插座/不限時)") while
 * preserving valid branch names (e.g., "(中山店)", "(Zhongshan)").
 */
export function normalizeShopName(name: string): string {
  if (!name) return ''

  let result = name.trim()

  // Strip known SEO noise patterns
  for (const pattern of SEO_NOISE_PATTERNS) {
    result = result.replace(pattern, '')
  }

  return result.trim()
}
