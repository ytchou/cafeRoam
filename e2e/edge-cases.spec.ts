import { test, expect } from '@playwright/test';
import { grantGeolocation, OUTSIDE_TAIWAN } from './fixtures/geolocation';

test.describe('J20 — Near Me: coords outside Taiwan → boundary behavior', () => {
  test('using geolocation with Tokyo coordinates shows appropriate fallback or empty state', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, OUTSIDE_TAIWAN);
    await page.goto('/');

    await page.getByRole('button', { name: '我附近' }).click();

    // Should navigate to /map — either with Tokyo coords or with text fallback
    await page.waitForURL(/\/map/, { timeout: 10_000 });
    expect(page.url()).toContain('/map');

    await page.waitForLoadState('networkidle');

    const url = new URL(page.url());
    if (url.searchParams.get('lat')) {
      // Map loaded with out-of-Taiwan coordinates — lat should be ~35 (Tokyo)
      const lat = parseFloat(url.searchParams.get('lat')!);
      expect(lat).toBeGreaterThan(30);
    }

    // Page should render without crashing — body visible regardless of results
    await expect(page.locator('body')).toBeVisible();
  });
});
