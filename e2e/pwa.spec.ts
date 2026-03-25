import { test, expect } from '@playwright/test';
import { first } from './fixtures/helpers';

test.describe('J17 — PWA manifest: 200 + brand metadata + icons', () => {
  test('app is installable: manifest has name, start_url, display mode, and at least one icon', async ({
    page,
  }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/);

    const manifest = await response.json();

    // Brand metadata required for PWA installability
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBeTruthy();

    // At least one icon is required by the installability criteria
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    const icon = first(manifest.icons);
    expect(icon?.src).toBeTruthy();
    expect(icon?.sizes).toBeTruthy();
  });
});
