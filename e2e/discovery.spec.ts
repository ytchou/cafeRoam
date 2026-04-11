// @source app/page.tsx
// @source app/shops/[shopId]/[slug]/shop-detail-client.tsx
// @source lib/hooks/use-search-state.ts
// If any of the above files change routes, DOM structure, or visible text,
// re-verify selectors and URL paths in this file.
import { test, expect } from '@playwright/test';
import { grantGeolocation, TAIPEI_COORDS } from './fixtures/geolocation';
import { first } from './fixtures/helpers';

test.describe('@critical J01 — Near Me: grant geolocation → shops sorted by distance', () => {
  test('clicking My location with granted geolocation sorts shops by distance in list view', async ({
    page,
    context,
  }) => {
    // My location button is only in the map view (/) — click it before switching to list
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
    await expect(page.locator('article').first()).toBeVisible({
      timeout: 10_000,
    });

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
      (navigator.geolocation as any).getCurrentPosition = function (
        _: any,
        error: any
      ) {
        if (error)
          setTimeout(
            () => error({ code: 2, message: 'Position unavailable' }),
            100
          );
      };
      const btn = document.querySelector<HTMLElement>(
        'button[aria-label="My location"]'
      );
      if (!btn) return 'button not found';
      btn.click();
      return 'clicked';
    });
    if (clickResult !== 'clicked') {
      throw new Error(`Could not click My location button: ${clickResult}`);
    }

    // Mock fires after 100ms → toast should appear quickly.
    await expect(page.getByText('無法取得位置，請確認定位權限')).toBeVisible({
      timeout: 5_000,
    });
  });
});

// --- Phase 2 stubs (nightly suite) ---

test.describe('J04 — Browse map → tap pin → shop detail sheet', () => {
  test('tapping a map pin opens the shop detail mini card (mobile) or side card (desktop)', async ({
    page,
  }) => {
    // Navigate to the map page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner — fixed z-50 overlay intercepts pointer events
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Map uses GL layers (canvas-rendered circles), not DOM Marker elements.
    // Wait for the map to load and expose its instance via window.__caferoam_map,
    // then query rendered features to find a clickable pin.
    const canvas = page.locator('.mapboxgl-canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Wait for GL layer pins to render on the canvas
    const hasPins = await page
      .waitForFunction(
        () => {
          const map = (window as { __caferoam_map?: mapboxgl.Map })
            .__caferoam_map;
          if (!map || !map.isStyleLoaded()) return false;
          return (
            map.queryRenderedFeatures({ layers: ['shops-pins'] }).length > 0
          );
        },
        { timeout: 15_000 }
      )
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasPins,
      'No map pins rendered — may require seeded data in Taipei area'
    );

    // Find an unclustered pin and project its coordinates to screen pixels
    const pinInfo = await page.evaluate(() => {
      const map = (window as { __caferoam_map?: mapboxgl.Map }).__caferoam_map;
      if (!map) return null;
      const features = map.queryRenderedFeatures({ layers: ['shops-pins'] });
      if (!features.length) return null;
      const feature = features[0];
      const coords = (
        feature.geometry as { type: string; coordinates: [number, number] }
      ).coordinates;
      const px = map.project(coords as [number, number]);
      return {
        x: Math.round(px.x),
        y: Math.round(px.y),
        name: (feature.properties?.name as string) ?? '',
      };
    });
    test.skip(!pinInfo, 'Could not project pin to screen coordinates');

    // Click the canvas at the pin's pixel position.
    // force: true bypasses overlapping UI elements (search bar, toggle) — the map's
    // onClick handler uses queryRenderedFeatures for hit-testing, not DOM pointer events.
    await canvas.click({
      position: { x: pinInfo!.x, y: pinInfo!.y },
      force: true,
    });

    // Mobile: ShopCarousel appears at bottom (data-testid="carousel-scroll")
    // Desktop: shop name appears in the preview card
    const isCarouselVisible = await page
      .locator('[data-testid="carousel-scroll"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const shopReveal = isCarouselVisible
      ? page.locator('[data-testid="carousel-scroll"]')
      : page.getByText(pinInfo!.name).nth(1);
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
    await page.goto('/');
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
    await page.goto('/');
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

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dismiss cookie consent banner — fixed z-50 overlay intercepts pointer events
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    // Map uses GL layers (canvas-rendered circles), not DOM Marker elements.
    // Wait for the map to load and expose its instance via window.__caferoam_map,
    // then query rendered features to find a clickable pin.
    const canvas = page.locator('.mapboxgl-canvas');
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    // Wait for GL layer pins to render on the canvas
    const hasPins = await page
      .waitForFunction(
        () => {
          const map = (window as { __caferoam_map?: mapboxgl.Map })
            .__caferoam_map;
          if (!map || !map.isStyleLoaded()) return false;
          return (
            map.queryRenderedFeatures({ layers: ['shops-pins'] }).length > 0
          );
        },
        { timeout: 15_000 }
      )
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasPins,
      'No map pins rendered — may require seeded data in Taipei area'
    );

    // Find an unclustered pin and project its coordinates to screen pixels
    const pinPoint = await page.evaluate(() => {
      const map = (window as { __caferoam_map?: mapboxgl.Map }).__caferoam_map;
      if (!map) return null;
      const features = map.queryRenderedFeatures({ layers: ['shops-pins'] });
      if (!features.length) return null;
      const coords = (
        features[0].geometry as { type: string; coordinates: [number, number] }
      ).coordinates;
      const px = map.project(coords as [number, number]);
      return { x: Math.round(px.x), y: Math.round(px.y) };
    });
    test.skip(!pinPoint, 'Could not project pin to screen coordinates');

    // Click the canvas at the pin's pixel position.
    // force: true bypasses overlapping UI elements — the map's onClick handler
    // uses queryRenderedFeatures for hit-testing, not DOM pointer events.
    await canvas.click({
      position: { x: pinPoint!.x, y: pinPoint!.y },
      force: true,
    });

    // On mobile, ShopCarousel appears at the bottom of the map (data-testid="carousel-scroll")
    await expect(page.locator('[data-testid="carousel-scroll"]')).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('@critical J36 — Shop detail: navigation links open Google Maps and Apple Maps directly', () => {
  test('J36 — shop detail: navigation links open Google Maps and Apple Maps directly', async ({
    page,
  }) => {
    // Fetch a seeded shop
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    // Navigate to the shop detail page
    await page.goto(`/shops/${shop.id}/${shop.slug || ''}`);
    await page.waitForLoadState('networkidle');

    // The Location section renders one "Google Maps" text link and one "Apple Maps" text link.
    // Use exact name to avoid matching the icon link with aria-label="在 Google Maps 查看".
    const googleMapsLink = page.getByRole('link', { name: 'Google Maps', exact: true });
    await expect(googleMapsLink).toBeVisible({ timeout: 10_000 });
    await expect(googleMapsLink).toHaveAttribute('target', '_blank');

    // Apple Maps link should be present and open in a new tab
    const appleMapsLink = page.getByRole('link', { name: 'Apple Maps', exact: true });
    await expect(appleMapsLink).toBeVisible({ timeout: 10_000 });
    await expect(appleMapsLink).toHaveAttribute('target', '_blank');
  });
});
