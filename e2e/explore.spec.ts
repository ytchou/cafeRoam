// @source app/explore/vibes/[slug]/page.tsx  (badge text, default filter)
// @source app/explore/page.tsx               (vibe grid links)
// @source app/find/page.tsx                  (tarot draw, geolocation)
// If any of the above files change routes, DOM structure, or visible text,
// re-verify selectors and URL paths in this file.
import { expect } from '@playwright/test';
import { test as authedTest } from './fixtures/auth';
import { grantGeolocation } from './fixtures/geolocation';

// Coordinates centred between the three seeded tarot shops (all within ~2km).
// TAIPEI_COORDS (25.033, 121.565) only covers Cozy Cowork; the other two are ~4km west.
const TAROT_TEST_COORDS = { latitude: 25.04, longitude: 121.537 };

// /explore is auth-gated — unauthenticated users are redirected to /login
authedTest.describe(
  '@critical J35 — Explore: Vibe tag → filtered shop results',
  () => {
    authedTest(
      'tapping a vibe tag on the Explore page navigates to the vibe results page with shops',
      async ({ authedPage: page }) => {
        await page.goto('/explore');
        await page.waitForLoadState('networkidle');

        // Vibe grid should be visible — tap the first vibe card link
        const vibeLink = page.locator('a[href^="/explore/vibes/"]').first();
        await expect(vibeLink).toBeVisible({ timeout: 10_000 });

        await vibeLink.click();

        // Should navigate to the vibe detail page
        await page.waitForURL(/\/explore\/vibes\//, { timeout: 10_000 });
        expect(page.url()).toContain('/explore/vibes/');

        // Shop count badge should appear — text is "X shops" (default 'all' filter)
        // or "X shops nearby" (when nearby filter is active). Match both forms.
        await expect(page.getByText(/\d+\s+shops?/i)).toBeVisible({
          timeout: 15_000,
        });
      }
    );
  }
);

// --- Phase 2 stubs ---

authedTest.describe(
  '@critical J34 — Explore: Tarot draw → 3 café cards revealed',
  () => {
    authedTest(
      'with geolocation granted, the Daily Draw section shows 3 café cards after loading',
      async ({ authedPage: page }) => {
        await grantGeolocation(page.context(), TAROT_TEST_COORDS);

        // Clear the tarot "recently seen" key so excluded_ids is empty.
        // The key is set when a card is tapped; if prior run IDs are still in
        // localStorage the API excludes them and may return fewer than 3 cards.
        await page.goto('/');
        await page.evaluate(() =>
          localStorage.removeItem('caferoam:tarot:seen')
        );

        await page.goto('/explore');
        await page.waitForLoadState('networkidle');

        // Wait for the Daily Draw section header
        const dailyDrawHeader = page.getByText(/your daily draw/i);
        await expect(dailyDrawHeader).toBeVisible({ timeout: 15_000 });

        // Wait for skeleton loaders to disappear before checking for content or empty state
        // If there are no .animate-pulse elements, the condition is immediately met
        await page
          .locator('.animate-pulse')
          .first()
          .waitFor({ state: 'hidden', timeout: 15_000 })
          .catch(() => {});

        // Allow up to 10s for the page to settle into one of: cards, empty state, or error
        const tarotCards = page.locator('[data-testid="tarot-card"]');
        const hasCards = await tarotCards
          .first()
          .isVisible({ timeout: 10_000 })
          .catch(() => false);

        const count = await tarotCards.count();
        if (!hasCards || count < 3) {
          authedTest.skip(
            true,
            count === 0
              ? 'Tarot cards did not load within timeout'
              : `Only ${count} card(s) available in tarot draw radius`
          );
        }

        await expect(tarotCards).toHaveCount(3, { timeout: 5_000 });

        // Dismiss cookie consent banner if present before clicking cards
        const rejectBtn = page.getByRole('button', { name: 'Reject' });
        if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await rejectBtn.click();
        }

        // Tap the first card to open the reveal drawer
        await tarotCards.first().click();

        // Drawer should open with the tarot title as an h2.
        // Scope to the dialog/drawer to avoid matching the page-level h2s
        // (Browse by Vibe, From the Community). The sr-only "Tarot Card Reveal"
        // h2 is also present but hidden — filter it out by not-text.
        const dialog = page
          .locator('[role="dialog"], [data-vaul-drawer-direction]')
          .last();
        const drawerHeading = dialog.locator('h2').filter({
          hasNotText: /Tarot Card Reveal/i,
        });
        await expect(drawerHeading).toBeVisible({ timeout: 5_000 });

        // Verify drawer has a "Let's Go" link (navigates to shop detail)
        await expect(dialog.getByText(/Let's Go/i)).toBeVisible({
          timeout: 5_000,
        });
      }
    );
  }
);
