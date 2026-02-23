import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { callClaudeWithTool, MODELS, type ModelAlias } from './utils/anthropic-client';
import type Anthropic from '@anthropic-ai/sdk';
import type { Pass2Shop, TaxonomyTag, TaxonomyProposal } from './types';

// ─── Constants ─────────────────────────────────────────────────

const INPUT_FILE = 'data/prebuild/pass2-full.json';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/taxonomy-proposed.json`;
const DEFAULT_PER_SHOP = 2;

// ─── Pure Functions (exported for testing) ─────────────────────

/**
 * Sample the longest non-empty reviews from each shop.
 * Returns an array of review texts.
 */
export function sampleReviews(shops: Pass2Shop[], perShop: number = DEFAULT_PER_SHOP): string[] {
  const samples: string[] = [];

  for (const shop of shops) {
    const nonEmpty = shop.reviews.filter((r) => r.text.trim().length > 0);
    const sorted = [...nonEmpty].sort((a, b) => b.text.length - a.text.length);
    const selected = sorted.slice(0, perShop);
    samples.push(...selected.map((r) => r.text));
  }

  return samples;
}

/**
 * Flatten a TaxonomyProposal (grouped by dimension) into a flat TaxonomyTag array.
 */
export function flattenProposalToTags(proposal: TaxonomyProposal): TaxonomyTag[] {
  const dimensions = ['functionality', 'time', 'ambience', 'mode'] as const;
  const tags: TaxonomyTag[] = [];

  for (const dim of dimensions) {
    for (const entry of proposal[dim]) {
      tags.push({
        id: entry.id,
        dimension: dim,
        label: entry.label,
        labelZh: entry.labelZh,
      });
    }
  }

  return tags;
}

// ─── Prompt & Tool Schema ──────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert on Taiwan's independent coffee shop scene. You analyze real Google Maps reviews from Taipei coffee shops to create a taxonomy system for semantic search.

Requirements:
- Each tag needs: id (snake_case English), label (English), labelZh (Traditional Chinese)
- Aim for 60-100 total tags across all 4 dimensions
- Tags should be specific enough for filtering but general enough to apply to multiple shops
- Include tags that reflect Taiwan coffee culture (e.g., 不限時, 限時, 有貓, 文青風)
- Think about what coffee lovers actually search for when choosing a cafe`;

function buildUserMessage(reviews: string[]): string {
  const reviewBlock = reviews.map((r, i) => `[${i + 1}] ${r}`).join('\n');
  return `Analyze these ${reviews.length} reviews from Taipei coffee shops and propose taxonomy tags organized into 4 dimensions:

1. **functionality** — What can you do there? (outlets, WiFi, laptop-friendly, reservations, pet-friendly, outdoor seating, etc.)
2. **time** — When should you go? (late night, early bird, no time limit, limited time, weekend-only, etc.)
3. **ambience** — What does it feel like? (quiet, lively, photogenic, cozy, industrial, Japanese-style, vintage, has cats, etc.)
4. **mode** — What's it best for? (deep work, casual work, reading, meeting friends, date, solo time, group hangout, etc.)

Reviews:
${reviewBlock}`;
}

const TAXONOMY_TOOL: Anthropic.Tool = {
  name: 'propose_taxonomy',
  description: 'Propose a taxonomy of tags for classifying coffee shops, organized by dimension',
  input_schema: {
    type: 'object' as const,
    properties: {
      functionality: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'snake_case English identifier' },
            label: { type: 'string', description: 'English label' },
            labelZh: { type: 'string', description: 'Traditional Chinese label' },
          },
          required: ['id', 'label', 'labelZh'],
        },
      },
      time: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            labelZh: { type: 'string' },
          },
          required: ['id', 'label', 'labelZh'],
        },
      },
      ambience: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            labelZh: { type: 'string' },
          },
          required: ['id', 'label', 'labelZh'],
        },
      },
      mode: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            labelZh: { type: 'string' },
          },
          required: ['id', 'label', 'labelZh'],
        },
      },
    },
    required: ['functionality', 'time', 'ambience', 'mode'],
  },
};

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      model: { type: 'string', default: 'sonnet' },
      'per-shop': { type: 'string', default: String(DEFAULT_PER_SHOP) },
    },
    strict: false,
  });

  const modelAlias = values.model as ModelAlias;
  const modelId = MODELS[modelAlias] ?? values.model;
  const perShop = parseInt(values['per-shop'] as string, 10);

  console.log(`[pass3a] Reading ${INPUT_FILE}...`);
  const shops: Pass2Shop[] = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`[pass3a] Loaded ${shops.length} shops`);

  const reviews = sampleReviews(shops, perShop);
  console.log(`[pass3a] Sampled ${reviews.length} reviews (${perShop} per shop)`);

  console.log(`[pass3a] Calling Claude (${modelId})...`);
  const result = await callClaudeWithTool<TaxonomyProposal>({
    model: modelId,
    systemPrompt: SYSTEM_PROMPT,
    userMessage: buildUserMessage(reviews),
    tool: TAXONOMY_TOOL,
  });

  const proposal = result.input;
  const tags = flattenProposalToTags(proposal);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(tags, null, 2));

  const counts = {
    functionality: proposal.functionality.length,
    time: proposal.time.length,
    ambience: proposal.ambience.length,
    mode: proposal.mode.length,
  };

  console.log('[pass3a] Taxonomy proposed:');
  console.log(`  functionality: ${counts.functionality} tags`);
  console.log(`  time:          ${counts.time} tags`);
  console.log(`  ambience:      ${counts.ambience} tags`);
  console.log(`  mode:          ${counts.mode} tags`);
  console.log(`  TOTAL:         ${tags.length} tags`);
  console.log(`  Tokens:        ${result.usage.inputTokens} in / ${result.usage.outputTokens} out`);
  console.log(`  Saved to:      ${OUTPUT_FILE}`);
  console.log('\n[pass3a] NEXT STEP: Review and curate taxonomy-proposed.json → taxonomy.json');
  console.log('  Copy the file, remove/rename tags as needed, then run pass3b.');
}

const isDirectRun = process.argv[1]?.includes('pass3a-taxonomy-seed');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass3a] Fatal error:', err);
    process.exit(1);
  });
}
