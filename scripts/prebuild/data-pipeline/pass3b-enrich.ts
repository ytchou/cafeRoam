import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  callClaudeWithTool,
  MODELS,
  type ModelAlias,
} from './utils/anthropic-client';
import type Anthropic from '@anthropic-ai/sdk';
import type {
  Pass2Shop,
  TaxonomyTag,
  EnrichmentData,
  EnrichedShop,
} from './types';

// ─── Constants ─────────────────────────────────────────────────

const PASS2_FILE = 'data/prebuild/pass2-full.json';
const TAXONOMY_FILE = 'data/prebuild/taxonomy.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass3-enriched.json`;
const VALID_MODES = new Set(['work', 'rest', 'social', 'mixed']);

// ─── Pure Functions (exported for testing) ─────────────────────

export interface CliArgs {
  model: string;
  startFrom: number;
  dryRun: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  // Default model: sonnet for quality ceiling. Production spec uses haiku — pass --model haiku to compare.
  const args: CliArgs = { model: 'sonnet', startFrom: 0, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--model':
        args.model = argv[++i] ?? 'sonnet';
        break;
      case '--start-from':
        // Performance optimization only — skips the first N shops in the array.
        // NOT a resume flag. For resume after failures, just re-run without this
        // flag; already-enriched shops are skipped automatically via ID lookup.
        args.startFrom = parseInt(argv[++i] ?? '0', 10);
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
    }
  }
  return args;
}

export function buildEnrichmentPrompt(
  shop: Pass2Shop,
  taxonomy: TaxonomyTag[]
): string {
  const nonEmptyReviews = shop.reviews
    .filter((r) => r.text.trim().length > 0)
    .map((r, i) => `[${i + 1}] (${r.stars}★) ${r.text}`);

  const taxonomyBlock = taxonomy
    .map((t) => `  ${t.id} (${t.dimension}) — ${t.label} / ${t.labelZh}`)
    .join('\n');

  return `Classify this coffee shop based on its reviews and attributes.

Shop: ${shop.name}
Categories: ${shop.categories.join(', ')}
Price range: ${shop.price_range ?? 'unknown'}
Socket: ${shop.socket || 'unknown'}
Limited time: ${shop.limited_time || 'unknown'}
Rating: ${shop.rating ?? 'unknown'} (${shop.review_count} reviews)
${shop.description ? `Description: ${shop.description}` : ''}

Reviews (${nonEmptyReviews.length}):
${nonEmptyReviews.join('\n')}

Available taxonomy tags (ONLY select from this list):
${taxonomyBlock}`;
}

export function validateEnrichmentResult(
  raw: EnrichmentData,
  taxonomy: TaxonomyTag[]
): EnrichmentData {
  const validIds = new Set(taxonomy.map((t) => t.id));

  const tags = raw.tags
    .filter((t) => validIds.has(t.id))
    .map((t) => ({
      id: t.id,
      confidence: Math.max(0, Math.min(1, t.confidence)),
    }));

  const mode = VALID_MODES.has(raw.mode) ? raw.mode : 'mixed';

  return {
    tags,
    summary: raw.summary,
    topReviews: raw.topReviews,
    mode: mode as EnrichmentData['mode'],
    enrichedAt: raw.enrichedAt,
    modelId: raw.modelId,
  };
}

// ─── Prompt & Tool Schema ──────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert on Taiwan's independent coffee shop scene. You classify coffee shops based on their Google Maps reviews using a predefined taxonomy.

Rules:
- ONLY select tags from the provided taxonomy list. Never invent new tags.
- Assign a confidence score (0.0-1.0) to each tag based on how strongly the reviews support it.
- Write a 2-3 sentence summary describing the shop's character — what makes it special, who it's for.
- Select the 3-5 most informative review excerpts that would help someone decide whether to visit.
- Classify the primary mode: work (focused tasks), rest (relaxation/reading), social (meeting people), or mixed.`;

const ENRICHMENT_TOOL: Anthropic.Tool = {
  name: 'classify_shop',
  description:
    'Classify a coffee shop based on its reviews using the provided taxonomy',
  input_schema: {
    type: 'object' as const,
    properties: {
      tags: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Tag ID from the taxonomy list',
            },
            confidence: {
              type: 'number',
              description: 'Confidence score 0.0-1.0',
            },
          },
          required: ['id', 'confidence'],
        },
        description: 'Tags that apply to this shop, selected from the taxonomy',
      },
      summary: {
        type: 'string',
        description: '2-3 sentence natural language profile of the shop',
      },
      topReviews: {
        type: 'array',
        items: { type: 'string' },
        description: '3-5 most informative review excerpts',
      },
      mode: {
        type: 'string',
        enum: ['work', 'rest', 'social', 'mixed'],
        description: 'Primary usage mode for this shop',
      },
    },
    required: ['tags', 'summary', 'topReviews', 'mode'],
  },
};

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const modelId = MODELS[args.model as ModelAlias] ?? args.model;

  console.log(`[pass3b] Model: ${modelId}`);
  console.log(`[pass3b] Start from: ${args.startFrom}`);
  console.log(`[pass3b] Dry run: ${args.dryRun}`);

  const shops: Pass2Shop[] = JSON.parse(readFileSync(PASS2_FILE, 'utf-8'));
  const taxonomy: TaxonomyTag[] = JSON.parse(
    readFileSync(TAXONOMY_FILE, 'utf-8')
  );
  console.log(
    `[pass3b] Loaded ${shops.length} shops, ${taxonomy.length} taxonomy tags`
  );

  // Load existing results for resume support
  let enriched: EnrichedShop[] = [];
  try {
    enriched = JSON.parse(readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(
      `[pass3b] Loaded ${enriched.length} existing results for resume`
    );
  } catch {
    // No existing results — start fresh
  }

  const enrichedIds = new Set(enriched.map((s) => s.cafenomad_id));
  const toProcess = args.dryRun
    ? shops.slice(0, 1)
    : shops.slice(args.startFrom);

  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const shop = toProcess[i];
    if (enrichedIds.has(shop.cafenomad_id)) {
      console.log(
        `  [${args.startFrom + i + 1}/${shops.length}] ${shop.name} — skipped (already enriched)`
      );
      continue;
    }

    console.log(
      `  [${args.startFrom + i + 1}/${shops.length}] ${shop.name}...`
    );

    try {
      const prompt = buildEnrichmentPrompt(shop, taxonomy);
      const result = await callClaudeWithTool<EnrichmentData>({
        model: modelId,
        systemPrompt: SYSTEM_PROMPT,
        userMessage: prompt,
        tool: ENRICHMENT_TOOL,
      });

      totalIn += result.usage.inputTokens;
      totalOut += result.usage.outputTokens;

      const validated = validateEnrichmentResult(
        {
          ...result.input,
          enrichedAt: new Date().toISOString(),
          modelId,
        },
        taxonomy
      );

      enriched.push({ ...shop, enrichment: validated });

      // Save after each shop for interrupt safety
      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2));

      console.log(
        `    -> ${validated.tags.length} tags, mode: ${validated.mode}`
      );
    } catch (err) {
      console.error(
        `    x Failed: ${err instanceof Error ? err.message : err}`
      );
      console.error(
        `    Skipping. Re-run to resume — already-enriched shops are skipped automatically.`
      );
    }
  }

  console.log('\n[pass3b] Enrichment complete:');
  console.log(`  Enriched: ${enriched.length}/${shops.length} shops`);
  console.log(`  Tokens:   ${totalIn} in / ${totalOut} out`);
  console.log(`  Saved to: ${OUTPUT_FILE}`);
}

const isDirectRun = process.argv[1]?.includes('pass3b-enrich');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass3b] Fatal error:', err);
    process.exit(1);
  });
}
