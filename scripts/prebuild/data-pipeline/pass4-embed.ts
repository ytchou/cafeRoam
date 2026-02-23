import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { embedTexts } from './utils/openai-client';
import type { EnrichedShop, TaxonomyTag, ShopEmbedding } from './types';

// ─── Constants ─────────────────────────────────────────────────

const ENRICHED_FILE = 'data/prebuild/pass3-enriched.json';
const TAXONOMY_FILE = 'data/prebuild/taxonomy.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass4-embeddings.json`;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // OpenAI allows up to 2048; stay well under token limits

// ─── Pure Functions (exported for testing) ─────────────────────

/**
 * Compose the text that will be embedded for a single shop.
 * Structure: name → summary → tags (bilingual) → top reviews.
 */
export function composeEmbeddingText(
  shop: EnrichedShop,
  taxonomy: TaxonomyTag[]
): string {
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
  const shops: EnrichedShop[] = JSON.parse(
    readFileSync(ENRICHED_FILE, 'utf-8')
  );
  const taxonomy: TaxonomyTag[] = JSON.parse(
    readFileSync(TAXONOMY_FILE, 'utf-8')
  );
  console.log(
    `[pass4] Loaded ${shops.length} enriched shops, ${taxonomy.length} taxonomy tags`
  );

  // Load existing results for resume support — skip already-embedded shops
  let output: ShopEmbedding[] = [];
  try {
    output = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(
      `[pass4] Loaded ${output.length} existing embeddings for resume`
    );
  } catch {
    // No existing results — start fresh
  }

  const embeddedIds = new Set(output.map((e) => e.cafenomad_id));
  const toEmbed = shops.filter((s) => !embeddedIds.has(s.cafenomad_id));

  if (toEmbed.length === 0) {
    console.log('[pass4] All shops already embedded. Nothing to do.');
  } else {
    const totalBatches = Math.ceil(toEmbed.length / BATCH_SIZE);
    console.log(
      `[pass4] Embedding ${toEmbed.length} shops in ${totalBatches} batch(es) of ${BATCH_SIZE}...`
    );

    for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
      const batch = toEmbed.slice(i, i + BATCH_SIZE);
      const batchTexts = batch.map((shop) =>
        composeEmbeddingText(shop, taxonomy)
      );
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(
        `  Batch ${batchNum}/${totalBatches} (${batch.length} shops)...`
      );

      const batchEmbeddings = await embedTexts(batchTexts, EMBEDDING_MODEL);

      const batchOutput: ShopEmbedding[] = batch.map((shop, j) => ({
        cafenomad_id: shop.cafenomad_id,
        google_place_id: shop.google_place_id,
        name: shop.name,
        embedding: batchEmbeddings[j],
        embeddedText: batchTexts[j],
        modelId: EMBEDDING_MODEL,
        embeddedAt: new Date().toISOString(),
      }));

      output.push(...batchOutput);

      // Save after each batch for interrupt safety
      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    }
  }

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
