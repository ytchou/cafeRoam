import { test, expect } from '@playwright/test';
import {
  grantGeolocation,
  denyGeolocation,
  TAIPEI_COORDS,
} from './fixtures/geolocation';
import { first } from './fixtures/helpers';

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
    await searchInput.press('Enter');

    // Should navigate to /map with query
    await page.waitForURL(/\/map\?.*q=coffee/, { timeout: 10_000 });
    expect(page.url()).toContain('q=coffee');
  });
});

// --- Phase 2 stubs (nightly suite) ---

test.describe('J04 — Browse map → tap pin → shop detail sheet', () => {
  test('tapping a map pin opens the shop detail mini card (mobile) or side card (desktop)', async ({
    page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    // Navigate to the map page
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Map pins are accessible DOM buttons with aria-label={shopName}
    const pinButton = page.locator(`button[aria-label="${shop.name}"]`);
    const hasPins = await pinButton
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !hasPins,
      'Shop pin not visible in current map viewport — may require seeded data in Taipei area'
    );

    await pinButton.click();

    // Mobile: ShopCarousel appears at bottom (data-testid="carousel-scroll")
    // Desktop: shop name appears in the side panel (second occurrence — first is the map pin label)
    // Check mobile carousel first; if absent, fall back to desktop side-panel text
    const isCarouselVisible = await page
      .locator('[data-testid="carousel-scroll"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const shopReveal = isCarouselVisible
      ? page.locator('[data-testid="carousel-scroll"]')
      : page.getByText(shop.name).nth(1);
    await expect(shopReveal).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('J18 — Shop detail: public access with OG tags', () => {
  test('navigating to /shops/{id}/{slug} shows shop name, photos, and OG meta tags', async ({
    page,
  }) => {
    // Shop detail is public — no auth required
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    await page.goto(`/shops/${shop.id}/${shop.slug || shop.id}`);
    await page.waitForLoadState('networkidle');

    // Shop name heading should render
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 10_000,
    });

    // OG meta tags must be present for social sharing
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogTitle).toContain(shop.name);

    const ogDesc = await page
      .locator('meta[property="og:description"]')
      .getAttribute('content');
    expect(ogDesc).toBeTruthy();

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .getAttribute('content');
    expect(ogImage).toBeTruthy();
  });
});

test.describe('J19 — Shop detail via slug redirect', () => {
  test('navigating to /shops/{id}/wrong-slug redirects to canonical slug URL', async ({
    page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop?.slug, 'No seeded shops with slugs available');

    await page.goto(`/shops/${shop.id}/definitely-wrong-slug-xyz`);
    await page.waitForLoadState('networkidle');

    // Should redirect to canonical slug URL
    expect(page.url()).toContain(`/shops/${shop.id}/${shop.slug}`);

    // Shop content should render after redirect
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('J22 — Map ↔ List view toggle', () => {
  test('clicking the list/map toggle button switches between map and list views', async ({
    page,
  }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Both view toggle buttons come from view-toggle.tsx
    const listViewBtn = page.getByRole('button', { name: /List view/i });
    const mapViewBtn = page.getByRole('button', { name: /Map view/i });

    await expect(listViewBtn).toBeVisible({ timeout: 10_000 });
    await expect(mapViewBtn).toBeVisible();

    // Click list view — list view button should become active (data-active)
    await listViewBtn.click();
    await expect(listViewBtn).toHaveAttribute('data-active', {
      timeout: 5_000,
    });

    // Click map view — map view button should become active
    await mapViewBtn.click();
    await expect(mapViewBtn).toHaveAttribute('data-active', { timeout: 5_000 });
  });
});

test.describe('J23 — List view: shops sorted by distance', () => {
  test('with geolocation granted, list view sorts shops by proximity', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, TAIPEI_COORDS);
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Switch to list view
    const listViewBtn = page.getByRole('button', { name: /List view/i });
    await expect(listViewBtn).toBeVisible({ timeout: 10_000 });
    await listViewBtn.click();

    // With geolocation, distance labels (e.g. "0.5 km") should appear on shop cards
    const distanceLabel = page.getByText(/\d+(\.\d+)?\s*(km|m)\b/i).first();
    const hasDistance = await distanceLabel
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !hasDistance,
      'No shop cards with distance labels — may require seeded data'
    );

    // At minimum one distance label is visible
    await expect(distanceLabel).toBeVisible();

    // If multiple shops are shown, the first should have the shortest distance
    const allDistances = page.getByText(/\d+(\.\d+)?\s*(km|m)\b/i);
    const count = await allDistances.count();
    if (count >= 2) {
      const firstText = await allDistances.nth(0).textContent();
      const secondText = await allDistances.nth(1).textContent();
      // Normalize both values to metres before comparing (handles mixed km/m units)
      const parseMetres = (t: string | null): number => {
        const m = t?.match(/([\d.]+)\s*(km|m)\b/i);
        if (!m) return 999_000;
        return m[2].toLowerCase() === 'km'
          ? parseFloat(m[1]) * 1000
          : parseFloat(m[1]);
      };
      expect(parseMetres(firstText)).toBeLessThanOrEqual(
        parseMetres(secondText)
      );
    }
  });
});

test.describe('J28 — Desktop: 2-column shop detail layout', () => {
  test('on desktop viewport, shop detail page renders in 2-column layout', async ({
    page,
  }) => {
    // Skip on mobile projects — viewport override doesn't change User-Agent or device profile
    const viewport = page.viewportSize();
    test.skip(
      !!viewport && viewport.width < 1024,
      'Desktop layout test — skipped on mobile viewport'
    );

    await page.setViewportSize({ width: 1280, height: 800 });

    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    await page.goto(`/shops/${shop.id}/${shop.slug || shop.id}`);
    await page.waitForLoadState('networkidle');

    // Shop heading renders at desktop width
    await expect(page.getByRole('heading').first()).toBeVisible({
      timeout: 10_000,
    });

    // Desktop layout: shop info is in the left column, map/actions in the right
    // Verify the page body fills the desktop viewport (not mobile-capped)
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeGreaterThanOrEqual(1280);

    // Both the primary content (shop name) and secondary content (directions/map) should be visible
    const hasDirections = await page
      .getByRole('button', { name: /get there/i })
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    const hasAddress = await page
      .getByText(/台灣|Taipei|Taiwan|台北/i)
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    // At desktop, supplementary info (directions or address) should be co-visible with the heading
    expect(hasDirections || hasAddress).toBe(true);
  });
});

test.describe('J29 — Mobile: mini card on pin tap', () => {
  test('on mobile viewport, tapping a map pin shows bottom mini card overlay', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Find the shop's map pin
    const pinButton = page.locator(`button[aria-label="${shop.name}"]`);
    const hasPins = await pinButton
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !hasPins,
      'Shop pin not visible — may require seeded data in Taipei area'
    );

    await pinButton.click();

    // On mobile, ShopCarousel appears at the bottom of the map (data-testid="carousel-scroll")
    await expect(page.locator('[data-testid="carousel-scroll"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('@critical J36 — Shop detail: tap Get Directions → DirectionsSheet opens', () => {
  test('tapping the Directions button on a shop detail page opens the DirectionsSheet with route options', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, TAIPEI_COORDS);

    // Fetch a seeded shop with coordinates
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    // Navigate to the shop detail page
    await page.goto(`/shops/${shop.id}/${shop.slug || ''}`);
    await page.waitForLoadState('networkidle');

    // "Get There" button should be visible (only renders if shop has lat/lng)
    const getThereBtn = page.getByRole('button', { name: /get there/i });
    test.skip(
      !(await getThereBtn.isVisible({ timeout: 5_000 }).catch(() => false)),
      'Shop has no coordinates — Get There button not rendered'
    );

    // Tap "Get There"
    await getThereBtn.click();

    // DirectionsSheet should open with "Directions" heading
    await expect(page.getByText('Directions')).toBeVisible({ timeout: 10_000 });

    // At least one route info row should appear (Walking, Driving, or MRT station name)
    const routeRow = page.getByText(/Walking|Driving|Station/i).first();
    await expect(routeRow).toBeVisible({ timeout: 10_000 });

    // Google Maps and Apple Maps deep links should be present
    await expect(
      page.getByRole('link', { name: /Google Maps/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Maps/i })).toBeVisible();
  });
});
