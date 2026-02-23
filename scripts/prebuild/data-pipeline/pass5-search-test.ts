import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { embedText } from './utils/openai-client';
import { cosineSimilarity } from './utils/cosine';
import type {
  ShopEmbedding,
  ProcessedShop,
  TaxonomyTag,
  SearchQuery,
  SearchTestResult,
} from './types';

// ─── Constants ─────────────────────────────────────────────────

const EMBEDDINGS_FILE = 'data/prebuild/pass4-embeddings.json';
const ENRICHED_FILE = 'data/prebuild/pass3c-processed.json';
const TAXONOMY_FILE = 'data/prebuild/taxonomy.json';
const QUERIES_FILE = 'scripts/prebuild/data-pipeline/search-queries.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass5-search-results.json`;
const TOP_K = 5;
const BOOST_PER_TAG = 0.05;

// ─── Pure Functions (exported for testing) ─────────────────────

/**
 * Compute taxonomy boost for a query against a shop's tags.
 * Chinese labels use substring matching (no word boundaries in Chinese).
 * English labels use word-boundary matching to avoid false positives
 * (e.g. tag "work" must not match "network").
 */
export function computeTaxonomyBoost(
  query: string,
  shopTags: Array<{ id: string; confidence: number }>,
  taxonomy: TaxonomyTag[],
  boostPerTag: number = BOOST_PER_TAG
): { boost: number; matchedTags: string[] } {
  const tagMap = new Map(taxonomy.map((t) => [t.id, t]));
  const matchedTags: string[] = [];
  const queryLower = query.toLowerCase();

  for (const shopTag of shopTags) {
    const tag = tagMap.get(shopTag.id);
    if (!tag) continue;

    const chineseMatch = query.includes(tag.labelZh);
    const escapedLabel = tag.label
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const englishMatch = new RegExp(`\\b${escapedLabel}\\b`).test(queryLower);

    if (chineseMatch || englishMatch) {
      matchedTags.push(tag.id);
    }
  }

  return {
    boost: matchedTags.length * boostPerTag,
    matchedTags,
  };
}

/**
 * Rank shops by cosine similarity + taxonomy boost.
 */
export function rankResults(
  query: string,
  candidates: Array<{
    name: string;
    score: number;
    shopTags: Array<{ id: string; confidence: number }>;
  }>,
  taxonomy: TaxonomyTag[]
): Array<{
  rank: number;
  name: string;
  score: number;
  boostedScore: number;
  matchedTags: string[];
}> {
  const scored = candidates.map((c) => {
    const { boost, matchedTags } = computeTaxonomyBoost(
      query,
      c.shopTags,
      taxonomy
    );
    return {
      name: c.name,
      score: c.score,
      boostedScore: c.score + boost,
      matchedTags,
    };
  });

  scored.sort((a, b) => b.boostedScore - a.boostedScore);

  return scored.map((s, i) => ({
    rank: i + 1,
    ...s,
  }));
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log('[pass5] Loading data...');
  const shopEmbeddings: ShopEmbedding[] = JSON.parse(
    readFileSync(EMBEDDINGS_FILE, 'utf-8')
  );
  const enrichedShops: ProcessedShop[] = JSON.parse(
    readFileSync(ENRICHED_FILE, 'utf-8')
  );
  const taxonomy: TaxonomyTag[] = JSON.parse(
    readFileSync(TAXONOMY_FILE, 'utf-8')
  );
  const queries: SearchQuery[] = JSON.parse(
    readFileSync(QUERIES_FILE, 'utf-8')
  );

  console.log(
    `[pass5] ${shopEmbeddings.length} shops, ${queries.length} queries, ${taxonomy.length} tags`
  );

  // Build a map from cafenomad_id → enrichment tags
  const enrichmentMap = new Map(
    enrichedShops.map((s) => [s.cafenomad_id, s.enrichment])
  );

  const results: SearchTestResult[] = [];

  for (const q of queries) {
    console.log(`\n[pass5] Query: "${q.query}" (${q.category})`);

    const queryEmbedding = await embedText(q.query);

    const candidates = shopEmbeddings.map((shop) => ({
      name: shop.name,
      score: cosineSimilarity(queryEmbedding, shop.embedding),
      shopTags: enrichmentMap.get(shop.cafenomad_id)?.tags ?? [],
    }));

    const ranked = rankResults(q.query, candidates, taxonomy);
    const topK = ranked.slice(0, TOP_K);

    results.push({
      query: q.query,
      category: q.category,
      results: topK,
    });

    for (const r of topK) {
      const boostStr =
        r.matchedTags.length > 0 ? ` (+${r.matchedTags.join(', ')})` : '';
      console.log(
        `  ${r.rank}. ${r.name} — ${r.boostedScore.toFixed(4)}${boostStr}`
      );
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

  console.log(`\n[pass5] Search test complete:`);
  console.log(`  Queries:  ${results.length}`);
  console.log(`  Saved to: ${OUTPUT_FILE}`);
  console.log(
    '\n[pass5] NEXT STEP: Review results manually. Score each query pass/fail.'
  );
  console.log('  Gate: 7/10 queries must return sensible top-3 results.');
}

const isDirectRun = process.argv[1]?.includes('pass5-search-test');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass5] Fatal error:', err);
    process.exit(1);
  });
}
