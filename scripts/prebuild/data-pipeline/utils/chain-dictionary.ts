// ─── Types ─────────────────────────────────────────────────────

export interface ChainInfo {
  /** Canonical brand name */
  brand: string;
  /** Approximate number of stores in Taiwan */
  storeCount: number;
}

// ─── Chain Data ────────────────────────────────────────────────

interface ChainEntry {
  canonical: string;
  aliases: string[];
  storeCount: number;
}

const CHAINS: ChainEntry[] = [
  {
    canonical: '路易莎咖啡',
    aliases: ['路易莎', 'Louisa', 'Louisa Coffee', 'louisa', 'louisa coffee'],
    storeCount: 524,
  },
  {
    canonical: '星巴克',
    aliases: ['Starbucks', 'Starbucks Coffee', '統一星巴克', 'starbucks', 'starbucks coffee'],
    storeCount: 500,
  },
  {
    canonical: '85度C',
    aliases: ['85°C', '85度C咖啡蛋糕烘焙專賣店', '85度c', '85°c'],
    storeCount: 435,
  },
  {
    canonical: 'cama咖啡',
    aliases: ['cama', 'cama cafe', 'cama現烘咖啡', 'CAMA', 'CAMA CAFE'],
    storeCount: 200,
  },
  {
    canonical: '丹堤咖啡',
    aliases: ['丹堤', 'Dante', 'dante', '丹堤 coffee'],
    storeCount: 68,
  },
  {
    canonical: '黑沃咖啡',
    aliases: ['黑沃', 'HWC', 'hwc', 'HWC Coffee', 'hwc coffee'],
    storeCount: 60,
  },
  {
    canonical: '伯朗咖啡館',
    aliases: ['伯朗', 'Mr. Brown', 'Mr. Brown Coffee', 'mr. brown', 'mr. brown coffee', 'mr brown'],
    storeCount: 30,
  },
  {
    canonical: '怡客咖啡',
    aliases: ['怡客', 'Ikari', 'ikari', 'Ikari Coffee', 'ikari coffee'],
    storeCount: 20,
  },
  {
    canonical: '西雅圖極品咖啡',
    aliases: ['西雅圖', 'Barista Coffee', 'barista coffee', 'Seattle Coffee'],
    storeCount: 15,
  },
  {
    canonical: 'Fika Fika Cafe',
    aliases: ['Fika Fika', 'fika fika', 'fika fika cafe'],
    storeCount: 5,
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function normalizeForDetection(s: string): string {
  return s
    .replace(/[\uFF01-\uFF5E]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Exported Functions ─────────────────────────────────────────

/**
 * Detects if a shop name belongs to a known Taiwan coffee chain.
 * Checks if the normalized name starts with the canonical brand or any alias.
 * Returns ChainInfo if matched, null otherwise.
 */
export function detectChain(name: string): ChainInfo | null {
  const normalized = normalizeForDetection(name);

  for (const chain of CHAINS) {
    const allNames = [chain.canonical, ...chain.aliases];
    for (const alias of allNames) {
      const normalizedAlias = normalizeForDetection(alias);
      if (normalized === normalizedAlias || normalized.startsWith(normalizedAlias + ' ') || normalized.startsWith(normalizedAlias + '　')) {
        return { brand: chain.canonical, storeCount: chain.storeCount };
      }
    }
  }

  return null;
}

/**
 * For chain shops, splits the name into brand + branch parts.
 * Returns null if the name is not a recognized chain.
 *
 * Example: '路易莎咖啡 中山店' → { brand: '路易莎咖啡', branch: '中山店' }
 * Example: '路易莎咖啡' → { brand: '路易莎咖啡', branch: '' }
 */
export function decomposeBrandBranch(
  name: string
): { brand: string; branch: string } | null {
  const normalized = normalizeForDetection(name);

  for (const chain of CHAINS) {
    const allNames = [chain.canonical, ...chain.aliases];
    for (const alias of allNames) {
      const normalizedAlias = normalizeForDetection(alias);
      if (normalized === normalizedAlias) {
        return { brand: chain.canonical, branch: '' };
      }
      if (normalized.startsWith(normalizedAlias + ' ')) {
        const branch = name.slice(alias.length).trim();
        return { brand: chain.canonical, branch };
      }
    }
  }

  return null;
}
