import { test, expect } from '@playwright/test';
import { grantGeolocation, TAIPEI_COORDS } from './fixtures/geolocation';

test.describe('@critical J35 — Explore: Vibe tag → filtered shop results', () => {
  test('tapping a vibe tag on the Explore page navigates to the vibe results page with shops', async ({
    page,
  }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Vibe grid should be visible — tap the first vibe card link
    const vibeLink = page.locator('a[href^="/explore/vibes/"]').first();
    await expect(vibeLink).toBeVisible({ timeout: 10_000 });

    await vibeLink.click();

    // Should navigate to the vibe detail page
    await page.waitForURL(/\/explore\/vibes\//, { timeout: 10_000 });
    expect(page.url()).toContain('/explore/vibes/');

    // Shop count badge and at least one shop row should appear
    await expect(page.getByText(/shops? nearby/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});

// --- Phase 2 stubs ---

test.describe('J34 — Explore: Tarot draw → 3 café cards revealed', () => {
  test.fixme('with geolocation granted, the Daily Draw section shows 3 café cards after loading', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, TAIPEI_COORDS);
    await page.goto('/explore');
  });
});
