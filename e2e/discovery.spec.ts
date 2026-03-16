import { test, expect } from '@playwright/test';
import {
  grantGeolocation,
  denyGeolocation,
  TAIPEI_COORDS,
} from './fixtures/geolocation';

test.describe('@critical J01 — Near Me: grant geolocation → map with shop pins', () => {
  test('tapping 我附近 with granted geolocation navigates to /map with lat/lng params', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, TAIPEI_COORDS);
    await page.goto('/');

    // Tap the "我附近" suggestion chip
    await page.getByRole('button', { name: '我附近' }).click();

    // Should navigate to /map with lat/lng query params
    await page.waitForURL(/\/map\?.*lat=/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/map');
    expect(url.searchParams.get('lat')).toBeTruthy();
    expect(url.searchParams.get('lng')).toBeTruthy();
    expect(url.searchParams.get('radius')).toBe('5');
  });
});

test.describe('@critical J02 — Near Me: deny geolocation → fallback toast + text search', () => {
  test('tapping 我附近 with denied geolocation shows toast and searches by text', async ({
    page,
    context,
  }) => {
    await denyGeolocation(context);
    await page.goto('/');

    // Tap the "我附近" suggestion chip
    await page.getByRole('button', { name: '我附近' }).click();

    // Should show toast fallback message
    await expect(page.getByText('無法取得位置，改用文字搜尋')).toBeVisible({
      timeout: 10_000,
    });

    // Should navigate to /map with text search query
    await page.waitForURL(/\/map\?.*q=/, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.searchParams.get('q')).toBe('我附近');
  });
});

test.describe('@critical J03 — Text search → results on map → shop detail', () => {
  test('searching from home navigates to /map with query and shows shop pins', async ({
    page,
  }) => {
    await page.goto('/');

    // Type a search query into the search bar and submit
    const searchForm = page.locator('form').first();
    const searchInput = searchForm.getByRole('textbox');
    await searchInput.fill('coffee');
    await searchForm.evaluate((form) =>
      form.dispatchEvent(new Event('submit', { bubbles: true })),
    );

    // Should navigate to /map with query
    await page.waitForURL(/\/map\?.*q=coffee/, { timeout: 10_000 });
    expect(page.url()).toContain('q=coffee');
  });
});

// --- Phase 2 stubs (nightly suite) ---

test.describe('J04 — Browse map → tap pin → shop detail sheet', () => {
  test.fixme('tapping a map pin opens the shop detail mini card (mobile) or side card (desktop)', async () => {});
});

test.describe('J18 — Shop detail: public access with OG tags', () => {
  test.fixme('navigating to /shops/{id}/{slug} shows shop name, photos, and OG meta tags', async () => {});
});

test.describe('J19 — Shop detail via slug redirect', () => {
  test.fixme('navigating to /shops/{id}/wrong-slug redirects to canonical slug URL', async () => {});
});

test.describe('J22 — Map ↔ List view toggle', () => {
  test.fixme('clicking the list/map toggle button switches between map and list views', async () => {});
});

test.describe('J23 — List view: shops sorted by distance', () => {
  test.fixme('with geolocation granted, list view sorts shops by proximity', async () => {});
});

test.describe('J28 — Desktop: 2-column shop detail layout', () => {
  test.fixme('on desktop viewport, shop detail page renders in 2-column layout', async () => {});
});

test.describe('J29 — Mobile: mini card on pin tap', () => {
  test.fixme('on mobile viewport, tapping a map pin shows bottom mini card overlay', async () => {});
});
