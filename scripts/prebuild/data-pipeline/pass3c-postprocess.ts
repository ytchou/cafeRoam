import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import type {
  EnrichedShop,
  EnrichmentData,
  ProcessedShop,
  ProcessedTag,
  ShopMode,
} from './types';

// ─── Constants ─────────────────────────────────────────────────

const ENRICHED_FILE = 'data/prebuild/pass3-enriched.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass3c-processed.json`;
const MODE_CONFIDENCE_THRESHOLD = 0.5;

const MODE_SIGNALS: Record<ShopMode, string[]> = {
  work: [
    'deep_work',
    'casual_work',
    'laptop_friendly',
    'power_outlets',
    'wifi_available',
    'no_time_limit',
    'late_night_work',
  ],
  rest: ['reading', 'solo_time', 'slow_morning', 'healing_therapeutic', 'quiet'],
  social: [
    'catch_up_friends',
    'small_group',
    'date',
    'lively',
    'community_vibe',
  ],
  coffee: ['specialty_coffee_focused', 'coffee_tasting', 'roastery_onsite'],
};

// ─── Pure Functions (exported for testing) ─────────────────────

/**
 * Compute IDF (inverse document frequency) for each tag across all shops.
 * idf(tag) = log(N / df(tag))
 */
export function computeTagIdf(
  enrichments: EnrichmentData[]
): Map<string, number> {
  const N = enrichments.length;
  const df = new Map<string, number>();

  for (const e of enrichments) {
    for (const tag of e.tags) {
      df.set(tag.id, (df.get(tag.id) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [tagId, count] of df) {
    idf.set(tagId, Math.log(N / count));
  }

  return idf;
}

/**
 * Score each tag's distinctiveness as confidence × idf.
 * Returns tags sorted by distinctiveness descending.
 */
export function scoreTagDistinctiveness(
  tags: Array<{ id: string; confidence: number }>,
  idf: Map<string, number>
): ProcessedTag[] {
  const scored = tags.map((t) => ({
    id: t.id,
    confidence: t.confidence,
    distinctiveness: t.confidence * (idf.get(t.id) ?? 0),
  }));

  scored.sort((a, b) => b.distinctiveness - a.distinctiveness);
  return scored;
}

/**
 * Infer modes from a shop's tags using the MODE_SIGNALS mapping.
 * A mode qualifies if the shop has at least one signal tag with confidence >= threshold.
 * Falls back to the original single mode if no signals match.
 */
export function inferModes(
  tags: Array<{ id: string; confidence: number }>,
  originalMode: EnrichmentData['mode'],
  threshold: number = MODE_CONFIDENCE_THRESHOLD
): ShopMode[] {
  const tagMap = new Map(tags.map((t) => [t.id, t.confidence]));
  const modes: ShopMode[] = [];

  for (const [mode, signals] of Object.entries(MODE_SIGNALS) as [
    ShopMode,
    string[],
  ][]) {
    const hasSignal = signals.some((s) => (tagMap.get(s) ?? 0) >= threshold);
    if (hasSignal) {
      modes.push(mode);
    }
  }

  if (modes.length === 0) {
    const fallback: ShopMode =
      originalMode === 'mixed' ? 'rest' : originalMode;
    modes.push(fallback);
  }

  return modes;
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log('[pass3c] Reading enriched data...');
  const shops: EnrichedShop[] = JSON.parse(
    readFileSync(ENRICHED_FILE, 'utf-8')
  );
  console.log(`[pass3c] Loaded ${shops.length} shops`);

  const enrichments = shops.map((s) => s.enrichment);
  const idf = computeTagIdf(enrichments);

  const processed: ProcessedShop[] = shops.map((shop) => {
    const scoredTags = scoreTagDistinctiveness(shop.enrichment.tags, idf);
    const modes = inferModes(shop.enrichment.tags, shop.enrichment.mode);

    return {
      ...shop,
      enrichment: {
        tags: scoredTags,
        summary: shop.enrichment.summary,
        topReviews: shop.enrichment.topReviews,
        modes,
        enrichedAt: shop.enrichment.enrichedAt,
        modelId: shop.enrichment.modelId,
      },
    };
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(processed, null, 2));

  // Print stats
  const allTags = processed.flatMap((s) => s.enrichment.tags);
  const avgTags = allTags.length / processed.length;

  const modeCounts: Record<string, number> = {};
  for (const shop of processed) {
    for (const mode of shop.enrichment.modes) {
      modeCounts[mode] = (modeCounts[mode] ?? 0) + 1;
    }
  }

  console.log('\n[pass3c] Post-processing complete:');
  console.log(`  Shops:     ${processed.length}`);
  console.log(`  Avg tags:  ${avgTags.toFixed(1)}`);
  console.log(`  Modes:     ${JSON.stringify(modeCounts)}`);

  const sortedIdf = [...idf.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\n  Top 5 most distinctive tags (highest IDF):');
  for (const [tag, score] of sortedIdf.slice(0, 5)) {
    console.log(`    ${tag}: ${score.toFixed(3)}`);
  }

  console.log('  Bottom 5 least distinctive tags (lowest IDF):');
  for (const [tag, score] of sortedIdf.slice(-5)) {
    console.log(`    ${tag}: ${score.toFixed(3)}`);
  }

  console.log(`\n  Saved to: ${OUTPUT_FILE}`);
}

const isDirectRun = process.argv[1]?.includes('pass3c-postprocess');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass3c] Fatal error:', err);
    process.exit(1);
  });
}
