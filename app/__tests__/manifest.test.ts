import { describe, it, expect } from 'vitest';
import manifest from '../manifest';

describe('PWA manifest', () => {
  it('returns correct app identity', () => {
    const m = manifest();
    expect(m.name).toBe('啡遊 CafeRoam');
    expect(m.short_name).toBe('啡遊');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/');
  });

  it('returns brand theme colors', () => {
    const m = manifest();
    expect(m.theme_color).toBe('#6F4E37');
    expect(m.background_color).toBe('#ffffff');
  });

  it('declares all three required PWA icons', () => {
    const m = manifest();
    const icons = m.icons ?? [];

    expect(icons).toHaveLength(3);
    expect(icons).toContainEqual({
      src: '/icon-192.png',
      sizes: '192x192',
      type: 'image/png',
    });
    expect(icons).toContainEqual({
      src: '/icon-512.png',
      sizes: '512x512',
      type: 'image/png',
    });
    expect(icons).toContainEqual({
      src: '/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    });
  });

  it('includes a maskable icon for Android adaptive icons', () => {
    const m = manifest();
    const maskable = (m.icons ?? []).find((i) => i.purpose === 'maskable');
    expect(maskable).toBeDefined();
    expect(maskable?.src).toBe('/icon-512-maskable.png');
  });
});
