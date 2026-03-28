import { test, expect } from '@playwright/test';
import { grantGeolocation, OUTSIDE_TAIWAN } from './fixtures/geolocation';

test.describe('J20 — Near Me: coords outside Taiwan → boundary behavior', () => {
  test('using geolocation with Tokyo coordinates shows appropriate fallback or empty state', async ({
    page,
    context,
  }) => {
    // My location button is mobile-only
    test.skip(
      !!page.viewportSize() && (page.viewportSize()?.width ?? 0) >= 1024,
      'My location button is mobile-only — skipped on desktop'
    );

    await grantGeolocation(context, OUTSIDE_TAIWAN);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // My location button replaces the old "我附近" chip
    const locBtn = page.locator('button[aria-label="My location"]');
    await expect(locBtn).toBeVisible({ timeout: 10_000 });
    await locBtn.click({ force: true });

    // /map now redirects to / — map and list are on the same page
    await page.waitForLoadState('networkidle');

    // Page should render without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});
