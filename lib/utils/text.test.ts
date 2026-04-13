import { describe, it, expect } from 'vitest';
import { normalizeShopName } from './text';

describe('normalizeShopName', () => {
  it('strips trailing parenthetical SEO noise', () => {
    expect(
      normalizeShopName('日淬 Sun Drip Coffee (完整菜單可點instagram)')
    ).toBe('日淬 Sun Drip Coffee');
  });

  it('strips multiple SEO patterns', () => {
    expect(normalizeShopName('咖啡店 (wifi/插座/不限時)')).toBe('咖啡店');
    expect(normalizeShopName('Cafe Name (菜單/menu/IG)')).toBe('Cafe Name');
  });

  it('preserves valid branch name parenthetical', () => {
    expect(normalizeShopName('星巴克 (中山店)')).toBe('星巴克 (中山店)');
    expect(normalizeShopName('Starbucks (Zhongshan)')).toBe(
      'Starbucks (Zhongshan)'
    );
  });

  it('handles no parenthetical', () => {
    expect(normalizeShopName('Simple Coffee Shop')).toBe('Simple Coffee Shop');
  });

  it('handles empty string', () => {
    expect(normalizeShopName('')).toBe('');
  });

  it('strips whitespace', () => {
    expect(normalizeShopName('  Coffee Shop  ')).toBe('Coffee Shop');
  });
});
