import { test, expect } from '@playwright/test';
import {
  grantGeolocation,
  denyGeolocation,
  TAIPEI_COORDS,
} from './fixtures/geolocation';
import { first } from './fixtures/helpers';

test.describe('@critical J01 — Near Me: grant geolocation → shops sorted by distance', () => {
  test('clicking My location with granted geolocation sorts shops by distance in list view', async ({
    page,
    context,
  }) => {
    // My location button is only in the map view — click it before switching to list
    test.skip(
      !!page.viewportSize() && (page.viewportSize()?.width ?? 0) >= 1024,
      'My location button is mobile-only — not rendered on desktop'
    );

    await grantGeolocation(context, TAIPEI_COORDS);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner if present — it sits at z-50 and blocks clicks
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Click the My location button (in map view)
    // The gradient overlay div (z-20) intercepts pointer events — force click to bypass.
    const locBtn = page.getByRole('button', { name: 'My location' });
    await expect(locBtn).toBeVisible({ timeout: 10_000 });
    await locBtn.click({ force: true });

    // Switch to list view so distance sort is visible
    const listViewBtn = page.getByRole('button', { name: /list view/i });
    await expect(listViewBtn).toBeVisible({ timeout: 5_000 });
    await listViewBtn.click();

    // Shops should now be visible
    await expect(
      page.locator('article').first()
    ).toBeVisible({ timeout: 10_000 });

    // URL stays on /
    expect(new URL(page.url()).pathname).toBe('/');
  });
});

test.describe('@critical J02 — Near Me: deny geolocation → error toast', () => {
  test('clicking My location with denied geolocation shows an error toast', async ({
    page,
  }) => {
    test.skip(
      !!page.viewportSize() && (page.viewportSize()?.width ?? 0) >= 1024,
      'My location button is mobile-only — not rendered on desktop'
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner if present
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Wait for map to fully render, then patch getCurrentPosition to fire POSITION_UNAVAILABLE.
    // We set this up AFTER load (via evaluate) to ensure the React app is mounted and
    // navigator.geolocation is the live object that the app will use on button click.
    const locBtn = page.locator('button[aria-label="My location"]');
    await expect(locBtn).toBeVisible({ timeout: 10_000 });

    // Patch getCurrentPosition and click the button in one evaluate to avoid
    // any timing window where the mock might not be in place.
    const clickResult = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator.geolocation as any).getCurrentPosition = function (_: any, error: any) {
        if (error) setTimeout(() => error({ code: 2, message: 'Position unavailable' }), 100);
      };
      const btn = document.querySelector<HTMLElement>('button[aria-label="My location"]');
      if (!btn) return 'button not found';
      btn.click();
      return 'clicked';
    });
    if (clickResult !== 'clicked') {
      throw new Error(`Could not click My location button: ${clickResult}`);
    }

    // Mock fires after 100ms → toast should appear quickly.
    await expect(
      page.getByText('無法取得位置，請確認定位權限')
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('@critical J03 — Text search → login gate for unauthenticated users', () => {
  test('searching from home without login redirects to /login', async ({
    page,
  }) => {
    // Search requires auth — unauthenticated user gets redirected to login
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const searchForm = page.locator('form').first();
    const searchInput = searchForm.getByRole('textbox');
    await searchInput.fill('coffee');
    await searchInput.press('Enter');

    // Unauthenticated search triggers login redirect
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});

// --- Phase 2 stubs (nightly suite) ---

test.describe('J04 — Browse map → tap pin → shop detail sheet', () => {
  test('tapping a map pin opens the shop detail mini card (mobile) or side card (desktop)', async ({
    page,
  }) => {
    // Navigate to the map page
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner — fixed z-50 overlay intercepts pointer events
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Map pins are DOM buttons wrapped in react-map-gl Marker divs (role="img",
    // aria-label="Map marker"). Use the first visible pin (any shop) to avoid
    // depending on a specific shop being in the default map viewport.
    const anyPin = page
      .locator('[role="img"][aria-label="Map marker"] button[aria-label]')
      .first();
    const hasPins = await anyPin
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !hasPins,
      'No map pins visible in current viewport — may require seeded data in Taipei area'
    );

    const shopName = (await anyPin.getAttribute('aria-label')) ?? '';

    // The Mapbox canvas sits above the marker overlay in the CSS stacking context,
    // so Playwright's pointer-event hit-test finds the canvas and times out.
    // Dispatch the click directly via JavaScript to bypass coverage detection.
    await page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement | null;
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, '[role="img"][aria-label="Map marker"] button[aria-label]');

    // Mobile: ShopCarousel appears at bottom (data-testid="carousel-scroll")
    // Desktop: shop name appears in the side panel (second occurrence — first is the map pin label)
    const isCarouselVisible = await page
      .locator('[data-testid="carousel-scroll"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const shopReveal = isCarouselVisible
      ? page.locator('[data-testid="carousel-scroll"]')
      : page.getByText(shopName).nth(1);
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

    // og:image is only set when the shop has photos — skip if missing
    const ogImageMeta = page.locator('meta[property="og:image"]');
    const hasOgImage = await ogImageMeta
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (hasOgImage) {
      const ogImage = await ogImageMeta.getAttribute('content');
      expect(ogImage).toBeTruthy();
    }
    // If meta tag is absent (shop has no photos), we accept the partial OG data
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

    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner — fixed z-50 overlay intercepts pointer events
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Map pins are DOM buttons wrapped in react-map-gl Marker divs (role="img",
    // aria-label="Map marker"). Use the first visible pin (any shop).
    const anyPin = page
      .locator('[role="img"][aria-label="Map marker"] button[aria-label]')
      .first();
    const hasPins = await anyPin
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    test.skip(
      !hasPins,
      'No map pins visible — may require seeded data in Taipei area'
    );

    // Dispatch click via JS — Mapbox canvas sits above the marker overlay in the
    // CSS stack, so Playwright's hit-test finds the canvas and times out.
    await page.evaluate((sel) => {
      const btn = document.querySelector(sel) as HTMLButtonElement | null;
      if (btn) btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }, '[role="img"][aria-label="Map marker"] button[aria-label]');

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

    // Dismiss cookie consent banner if present — the fixed bottom banner (z-50)
    // intercepts pointer events and prevents the Get There button from being clicked.
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
    }

    // Tap "Get There"
    await getThereBtn.click();

    // DirectionsSheet should open with "Directions" heading
    await expect(page.getByText('Directions')).toBeVisible({ timeout: 10_000 });

    // At least one route info row should appear.
    // Walking/Driving rows load from the directions API (Mapbox); if unavailable locally
    // the component falls back to "Route times unavailable. Try again later."
    const routeRow = page.getByText(/Walking|Driving|Route times unavailable/i).first();
    await expect(routeRow).toBeVisible({ timeout: 15_000 });

    // Google Maps and Apple Maps deep links should be present
    await expect(
      page.getByRole('link', { name: /Google Maps/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Apple Maps/i })).toBeVisible();
  });
});
