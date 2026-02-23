import { describe, it, expect } from 'vitest';
import {
  isKnownClosed,
  isShellEntry,
  isOutOfBounds,
  findDuplicates,
} from './filters';
import type { CafeNomadEntry } from '../types';

// ─── Helper ────────────────────────────────────────────────────

function makeCafeNomadEntry(
  overrides: Partial<CafeNomadEntry> = {}
): CafeNomadEntry {
  return {
    id: 'test-id',
    name: '測試咖啡',
    city: 'taipei',
    wifi: 4,
    seat: 4,
    quiet: 3,
    tasty: 4,
    cheap: 3,
    music: 3,
    url: 'https://example.com',
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

// ─── isKnownClosed ─────────────────────────────────────────────

describe('isKnownClosed', () => {
  it('returns true for names containing 已歇業', () => {
    expect(isKnownClosed('好咖啡（已歇業）')).toBe(true);
  });

  it('returns true for names containing 暫停營業', () => {
    expect(isKnownClosed('暫停營業 - 某咖啡')).toBe(true);
  });

  it('returns true for names containing 已關', () => {
    expect(isKnownClosed('某店已關')).toBe(true);
  });

  it('returns true for names containing 已結束', () => {
    expect(isKnownClosed('已結束營業的店')).toBe(true);
  });

  it('returns false for normal shop names', () => {
    expect(isKnownClosed('路易莎咖啡 中山店')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKnownClosed('')).toBe(false);
  });
});

// ─── isShellEntry ──────────────────────────────────────────────

describe('isShellEntry', () => {
  it('returns true when name is empty', () => {
    expect(isShellEntry(makeCafeNomadEntry({ name: '' }))).toBe(true);
  });

  it('returns true when address is empty', () => {
    expect(isShellEntry(makeCafeNomadEntry({ address: '' }))).toBe(true);
  });

  it('returns true when latitude is empty', () => {
    expect(isShellEntry(makeCafeNomadEntry({ latitude: '' }))).toBe(true);
  });

  it('returns true when longitude is empty', () => {
    expect(isShellEntry(makeCafeNomadEntry({ longitude: '' }))).toBe(true);
  });

  it('returns true when latitude is 0', () => {
    expect(isShellEntry(makeCafeNomadEntry({ latitude: '0' }))).toBe(true);
  });

  it('returns false for complete entries', () => {
    expect(isShellEntry(makeCafeNomadEntry())).toBe(false);
  });
});

// ─── isOutOfBounds ─────────────────────────────────────────────

describe('isOutOfBounds', () => {
  it('returns false for coordinates within Taipei bounds', () => {
    expect(isOutOfBounds(25.05, 121.52)).toBe(false);
  });

  it('returns true for latitude below lower bound (24.95)', () => {
    expect(isOutOfBounds(24.94, 121.52)).toBe(true);
  });

  it('returns true for latitude above upper bound (25.22)', () => {
    expect(isOutOfBounds(25.23, 121.52)).toBe(true);
  });

  it('returns true for longitude below lower bound (121.40)', () => {
    expect(isOutOfBounds(25.05, 121.39)).toBe(true);
  });

  it('returns true for longitude above upper bound (121.65)', () => {
    expect(isOutOfBounds(25.05, 121.66)).toBe(true);
  });

  it('returns false for boundary edge values (inclusive)', () => {
    expect(isOutOfBounds(24.95, 121.40)).toBe(false);
    expect(isOutOfBounds(25.22, 121.65)).toBe(false);
  });
});

// ─── findDuplicates ────────────────────────────────────────────

describe('findDuplicates', () => {
  it('returns empty set when no duplicates exist', () => {
    const shops = [
      { name: 'Shop A', latitude: 25.05, longitude: 121.52, cafenomad_id: '1' },
      { name: 'Shop B', latitude: 25.06, longitude: 121.53, cafenomad_id: '2' },
    ];
    expect(findDuplicates(shops)).toEqual(new Set());
  });

  it('flags the second entry when same name is within 50m', () => {
    const shops = [
      { name: '好咖啡', latitude: 25.050000, longitude: 121.520000, cafenomad_id: '1' },
      { name: '好咖啡', latitude: 25.050001, longitude: 121.520001, cafenomad_id: '2' },
    ];
    const dupes = findDuplicates(shops);
    expect(dupes.has('2')).toBe(true);
    expect(dupes.has('1')).toBe(false);
  });

  it('does not flag shops with same name but far apart', () => {
    const shops = [
      { name: '好咖啡', latitude: 25.05, longitude: 121.52, cafenomad_id: '1' },
      { name: '好咖啡', latitude: 25.06, longitude: 121.53, cafenomad_id: '2' },
    ];
    expect(findDuplicates(shops)).toEqual(new Set());
  });

  it('does not flag nearby shops with different names', () => {
    const shops = [
      { name: 'Shop A', latitude: 25.050000, longitude: 121.520000, cafenomad_id: '1' },
      { name: 'Shop B', latitude: 25.050001, longitude: 121.520001, cafenomad_id: '2' },
    ];
    expect(findDuplicates(shops)).toEqual(new Set());
  });
});
