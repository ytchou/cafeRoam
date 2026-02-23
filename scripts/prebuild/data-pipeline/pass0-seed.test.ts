import { describe, it, expect } from 'vitest';
import { runPass0 } from './pass0-seed';
import type { CafeNomadEntry } from './types';

// ─── Helpers ───────────────────────────────────────────────────

function makeCafeNomadEntry(
  overrides: Partial<CafeNomadEntry> = {}
): CafeNomadEntry {
  return {
    id: 'test-id-1',
    name: '好咖啡',
    city: 'taipei',
    wifi: 4,
    seat: 4,
    quiet: 3,
    tasty: 4,
    cheap: 3,
    music: 3,
    url: 'https://facebook.com/test',
    address: '台北市中山區南京東路100號',
    latitude: '25.05',
    longitude: '121.52',
    limited_time: 'no',
    socket: 'yes',
    standing_desk: 'no',
    mrt: '中山',
    open_time: '09:00-18:00',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('runPass0', () => {
  it('keeps valid entries and transforms to Pass0Shop format', () => {
    const input = [makeCafeNomadEntry()];
    const result = runPass0(input);

    expect(result.shops).toHaveLength(1);
    expect(result.shops[0]).toEqual({
      cafenomad_id: 'test-id-1',
      name: '好咖啡',
      address: '台北市中山區南京東路100號',
      latitude: 25.05,
      longitude: 121.52,
      social_url: 'https://facebook.com/test',
      mrt: '中山',
      limited_time: 'no',
      socket: 'yes',
    });
  });

  it('filters out known-closed shops', () => {
    const input = [makeCafeNomadEntry({ name: '某店（已歇業）' })];
    const result = runPass0(input);
    expect(result.shops).toHaveLength(0);
    expect(result.stats.filtered_closed).toBe(1);
  });

  it('filters out shell entries', () => {
    const input = [makeCafeNomadEntry({ name: '' })];
    const result = runPass0(input);
    expect(result.shops).toHaveLength(0);
    expect(result.stats.filtered_shell).toBe(1);
  });

  it('filters out out-of-bounds entries', () => {
    const input = [makeCafeNomadEntry({ latitude: '20.00' })];
    const result = runPass0(input);
    expect(result.shops).toHaveLength(0);
    expect(result.stats.filtered_bounds).toBe(1);
  });

  it('filters out duplicates (same name within 50m)', () => {
    const input = [
      makeCafeNomadEntry({ id: 'a', name: '好咖啡' }),
      makeCafeNomadEntry({ id: 'b', name: '好咖啡', latitude: '25.050001' }),
    ];
    const result = runPass0(input);
    expect(result.shops).toHaveLength(1);
    expect(result.stats.filtered_duplicates).toBe(1);
  });

  it('returns stats with total and filtered counts', () => {
    const input = [
      makeCafeNomadEntry({ id: '1' }),
      makeCafeNomadEntry({ id: '2', name: '已歇業的店' }),
      makeCafeNomadEntry({ id: '3', address: '' }),
    ];
    const result = runPass0(input);
    expect(result.stats.total_input).toBe(3);
    expect(result.stats.total_output).toBe(1);
  });
});
