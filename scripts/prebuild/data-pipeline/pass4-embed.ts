import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { embedTexts } from './utils/openai-client';
import type { EnrichedShop, TaxonomyTag, ShopEmbedding } from './types';

// ─── Constants ─────────────────────────────────────────────────

const ENRICHED_FILE = 'data/prebuild/pass3-enriched.json';
const TAXONOMY_FILE = 'data/prebuild/taxonomy.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass4-embeddings.json`;
const EMBEDDING_MODEL = 'text-embedding-3-small';

// ─── Pure Functions (exported for testing) ─────────────────────

/**
 * Compose the text that will be embedded for a single shop.
 * Structure: name → summary → tags (bilingual) → top reviews.
 */
export function composeEmbeddingText(shop: EnrichedShop, taxonomy: TaxonomyTag[]): string {
  const tagMap = new Map(taxonomy.map((t) => [t.id, t]));

  const tagLabels = shop.enrichment.tags
    .map((t) => {
      const tag = tagMap.get(t.id);
      return tag ? `${tag.label} / ${tag.labelZh}` : null;
    })
    .filter(Boolean)
    .join(', ');

  const reviewBlock = shop.enrichment.topReviews
    .map((r) => `- ${r}`)
    .join('\n');

  return [
    shop.name,
    '',
    shop.enrichment.summary,
    '',
    `Tags: ${tagLabels}`,
    '',
    reviewBlock ? `Selected reviews:\n${reviewBlock}` : '',
  ]
    .join('\n')
    .trim();
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log(`[pass4] Reading enriched data...`);
  const shops: EnrichedShop[] = JSON.parse(readFileSync(ENRICHED_FILE, 'utf-8'));
  const taxonomy: TaxonomyTag[] = JSON.parse(readFileSync(TAXONOMY_FILE, 'utf-8'));
  console.log(`[pass4] Loaded ${shops.length} enriched shops, ${taxonomy.length} taxonomy tags`);

  const texts = shops.map((shop) => composeEmbeddingText(shop, taxonomy));

  console.log(`[pass4] Embedding ${texts.length} texts with ${EMBEDDING_MODEL}...`);
  const embeddings = await embedTexts(texts, EMBEDDING_MODEL);

  const output: ShopEmbedding[] = shops.map((shop, i) => ({
    cafenomad_id: shop.cafenomad_id,
    google_place_id: shop.google_place_id,
    name: shop.name,
    embedding: embeddings[i],
    embeddedText: texts[i],
    modelId: EMBEDDING_MODEL,
    embeddedAt: new Date().toISOString(),
  }));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log('[pass4] Embedding complete:');
  console.log(`  Shops:      ${output.length}`);
  console.log(`  Dimensions: ${output[0]?.embedding.length ?? 'N/A'}`);
  console.log(`  Saved to:   ${OUTPUT_FILE}`);
}

const isDirectRun = process.argv[1]?.includes('pass4-embed');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass4] Fatal error:', err);
    process.exit(1);
  });
}
