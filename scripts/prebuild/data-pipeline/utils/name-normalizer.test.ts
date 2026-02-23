import { describe, it, expect } from 'vitest';
import { normalizeName } from './name-normalizer';

describe('normalizeName', () => {
  // ─── Suffix Stripping ─────────────────────────────────────────

  it('strips 咖啡館 suffix', () => {
    expect(normalizeName('好咖啡咖啡館')).toBe('好咖啡');
  });

  it('strips 咖啡店 suffix', () => {
    expect(normalizeName('山頂咖啡咖啡店')).toBe('山頂咖啡');
  });

  it('strips 咖啡廳 suffix', () => {
    expect(normalizeName('老地方咖啡廳')).toBe('老地方');
  });

  it('strips 咖啡專賣店 suffix (longer match before shorter)', () => {
    expect(normalizeName('精品咖啡專賣店')).toBe('精品');
  });

  it('strips 門市 suffix', () => {
    expect(normalizeName('路易莎咖啡門市')).toBe('路易莎咖啡');
  });

  it('strips 分店 suffix', () => {
    expect(normalizeName('丹堤咖啡分店')).toBe('丹堤咖啡');
  });

  it('strips coffee shop suffix (case-insensitive via lowercase step)', () => {
    expect(normalizeName('Mountain Coffee Shop')).toBe('mountain');
  });

  it('strips cafe suffix', () => {
    expect(normalizeName('Sunrise Cafe')).toBe('sunrise');
  });

  // ─── Does NOT Strip ───────────────────────────────────────────

  it('does NOT strip standalone 咖啡 (could be the entire name)', () => {
    expect(normalizeName('咖啡')).toBe('咖啡');
  });

  it('does NOT strip 咖啡 when it is the full name before suffix check', () => {
    // "好咖啡" does not end with any suffix → unchanged
    expect(normalizeName('好咖啡')).toBe('好咖啡');
  });

  it('does NOT strip suffix if it equals the entire name', () => {
    // "咖啡館" ends with 咖啡館 but length === suffix length → no strip
    expect(normalizeName('咖啡館')).toBe('咖啡館');
  });

  // ─── Full-Width → Half-Width ──────────────────────────────────

  it('converts full-width digits to half-width', () => {
    // ８５度Ｃ → 85度C
    expect(normalizeName('８５度Ｃ')).toBe('85度c');
  });

  it('converts full-width Latin letters', () => {
    expect(normalizeName('Ａｂｃ')).toBe('abc');
  });

  // ─── Whitespace & Case ────────────────────────────────────────

  it('lowercases Latin characters', () => {
    expect(normalizeName('Starbucks')).toBe('starbucks');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeName('好  咖  啡')).toBe('好 咖 啡');
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeName('  好咖啡  ')).toBe('好咖啡');
  });

  // ─── Edge Cases ───────────────────────────────────────────────

  it('handles empty string', () => {
    expect(normalizeName('')).toBe('');
  });

  it('preserves branch identifiers (中山, 信義) — they are not stripped', () => {
    // 中山店 does NOT end with any suffix in our list → preserved
    expect(normalizeName('路易莎咖啡 中山店')).toBe('路易莎咖啡 中山店');
  });
});
