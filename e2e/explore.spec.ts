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

test.describe('@critical J34 — Explore: Tarot draw → 3 café cards revealed', () => {
  test('with geolocation granted, the Daily Draw section shows 3 café cards after loading', async ({
    page,
    context,
  }) => {
    await grantGeolocation(context, TAIPEI_COORDS);
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');

    // Wait for the Daily Draw section header
    const dailyDrawHeader = page.getByText(/your daily draw/i);
    await expect(dailyDrawHeader).toBeVisible({ timeout: 15_000 });

    // Check for empty state — skip if no shops in radius
    const emptyState = page.getByText(/enable location|expand radius|no caf/i);
    if (await emptyState.isVisible({ timeout: 2_000 }).catch(() => false)) {
      test.skip(true, 'No shops available in tarot draw radius');
    }

    // Wait for skeleton loaders to disappear (skeletons have animate-pulse)
    await expect(page.locator('.animate-pulse').first()).toBeHidden({ timeout: 15_000 });

    // Tarot card buttons have data-testid="tarot-card" or are scoped inside the daily-draw section
    const tarotCards = page
      .locator('[data-testid="daily-draw"]')
      .getByRole('button')
      .or(page.locator('[data-testid="tarot-card"]'));
    await expect(tarotCards).toHaveCount(3, { timeout: 10_000 });

    // Tap the first card to open the reveal drawer
    await tarotCards.first().click();

    // Drawer should open with shop name (h2 heading inside the drawer)
    const drawerHeading = page.getByRole('heading', { level: 2 });
    await expect(drawerHeading).toBeVisible({ timeout: 5_000 });

    // Verify drawer has a "Let's Go" link (navigates to shop detail)
    await expect(page.getByText(/Let's Go/i)).toBeVisible();
  });
});
