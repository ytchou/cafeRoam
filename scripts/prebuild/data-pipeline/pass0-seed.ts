import { writeFileSync, mkdirSync } from 'node:fs';
import { isKnownClosed, isShellEntry, isOutOfBounds, findDuplicates } from './utils/filters';
import type { CafeNomadEntry, Pass0Shop } from './types';

// ─── Constants ─────────────────────────────────────────────────

const CAFENOMAD_API = 'https://cafenomad.tw/api/v1.2/cafes/taipei';
const OUTPUT_DIR = 'data/prebuild';
const OUTPUT_FILE = `${OUTPUT_DIR}/pass0-seed.json`;

// ─── Pipeline ──────────────────────────────────────────────────

export interface Pass0Stats {
  total_input: number;
  filtered_closed: number;
  filtered_shell: number;
  filtered_bounds: number;
  filtered_duplicates: number;
  total_output: number;
}

export interface Pass0Result {
  shops: Pass0Shop[];
  stats: Pass0Stats;
}

/**
 * Core pipeline logic — pure function, no I/O.
 * Takes raw Cafe Nomad entries, applies all filters, returns cleaned shops.
 */
export function runPass0(entries: CafeNomadEntry[]): Pass0Result {
  const stats: Pass0Stats = {
    total_input: entries.length,
    filtered_closed: 0,
    filtered_shell: 0,
    filtered_bounds: 0,
    filtered_duplicates: 0,
    total_output: 0,
  };

  // Step 1: Filter known-closed
  const afterClosed = entries.filter((e) => {
    if (isKnownClosed(e.name)) {
      stats.filtered_closed++;
      return false;
    }
    return true;
  });

  // Step 2: Filter shell entries
  const afterShell = afterClosed.filter((e) => {
    if (isShellEntry(e)) {
      stats.filtered_shell++;
      return false;
    }
    return true;
  });

  // Step 3: Filter out-of-bounds
  const afterBounds = afterShell.filter((e) => {
    const lat = parseFloat(e.latitude);
    const lng = parseFloat(e.longitude);
    if (isOutOfBounds(lat, lng)) {
      stats.filtered_bounds++;
      return false;
    }
    return true;
  });

  // Step 4: Transform to Pass0Shop
  const transformed: Pass0Shop[] = afterBounds.map((e) => ({
    cafenomad_id: e.id,
    name: e.name,
    address: e.address,
    latitude: parseFloat(e.latitude),
    longitude: parseFloat(e.longitude),
    social_url: e.url,
    mrt: e.mrt,
    limited_time: e.limited_time,
    socket: e.socket,
  }));

  // Step 5: Deduplicate
  const duplicateIds = findDuplicates(transformed);
  stats.filtered_duplicates = duplicateIds.size;

  const shops = transformed.filter((s) => !duplicateIds.has(s.cafenomad_id));
  stats.total_output = shops.length;

  return { shops, stats };
}

// ─── CLI Entry Point ───────────────────────────────────────────

async function main() {
  console.log('[pass0] Fetching Cafe Nomad API...');
  const response = await fetch(CAFENOMAD_API);

  if (!response.ok) {
    throw new Error(`Cafe Nomad API returned ${response.status}: ${response.statusText}`);
  }

  const entries: CafeNomadEntry[] = await response.json();
  console.log(`[pass0] Got ${entries.length} entries from API`);

  const { shops, stats } = runPass0(entries);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(shops, null, 2));

  console.log('[pass0] Pipeline complete:');
  console.log(`  Input:       ${stats.total_input}`);
  console.log(`  - Closed:    ${stats.filtered_closed}`);
  console.log(`  - Shell:     ${stats.filtered_shell}`);
  console.log(`  - Bounds:    ${stats.filtered_bounds}`);
  console.log(`  - Dupes:     ${stats.filtered_duplicates}`);
  console.log(`  Output:      ${stats.total_output}`);
  console.log(`  Saved to:    ${OUTPUT_FILE}`);
}

// Only run main() when executed directly (not imported in tests)
const isDirectRun = process.argv[1]?.includes('pass0-seed');
if (isDirectRun) {
  main().catch((err) => {
    console.error('[pass0] Fatal error:', err);
    process.exit(1);
  });
}
