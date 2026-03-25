import { test, expect } from '@playwright/test';

test.describe('J17 — PWA manifest: 200 + brand metadata + icons', () => {
  test('GET /manifest.webmanifest returns valid JSON with CafeRoam brand data and icon references', async ({
    page,
  }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/);

    const manifest = await response.json();

    // Brand metadata
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();

    // Icon references
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    const firstIcon = manifest.icons[0];
    expect(firstIcon.src).toBeTruthy();
    expect(firstIcon.sizes).toBeTruthy();
  });
});
