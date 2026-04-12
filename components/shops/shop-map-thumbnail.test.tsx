import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('ShopMapThumbnail source contract', () => {
  it("imports 'mapbox-gl/dist/mapbox-gl.css' so the desktop marker renders", () => {
    // Resolve relative to this test file's location
    const dir = dirname(
      resolve('components/shops/shop-map-thumbnail.test.tsx')
    );
    const source = readFileSync(resolve(dir, 'shop-map-thumbnail.tsx'), 'utf8');
    expect(source).toContain("import 'mapbox-gl/dist/mapbox-gl.css'");
  });
});
