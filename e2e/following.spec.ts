import { test, expect } from './fixtures/auth';
import { test as unauthTest, expect as unauthExpect } from '@playwright/test';
import { first } from './fixtures/helpers';

test.describe.serial(
  '@critical J40 — Follow/unfollow toggle',
  () => {
    let shopUrl: string;

    test.beforeAll(async ({ browser }) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const response = await page.request.get(
        '/api/shops?featured=true&limit=1'
      );
      const shops = await response.json();
      const shop = first(shops);
      if (shop) {
        shopUrl = `/shops/${shop.id}/${shop.slug || shop.id}`;
      }
      await page.close();
      await ctx.close();
    });

    test('following a shop toggles button to "Unfollow this shop"', async ({
      authedPage: page,
    }) => {
      test.skip(!shopUrl, 'No seeded shops available');

      await page.goto(shopUrl);
      await page.waitForLoadState('networkidle');

      const followBtn = page.getByRole('button', {
        name: 'Follow this shop',
      });
      await expect(followBtn).toBeVisible({ timeout: 10_000 });

      await followBtn.click();

      // After click, button label should change to "Unfollow this shop"
      await expect(
        page.getByRole('button', { name: 'Unfollow this shop' })
      ).toBeVisible({ timeout: 10_000 });
    });

    test('unfollowing the shop reverts button to "Follow this shop"', async ({
      authedPage: page,
    }) => {
      test.skip(!shopUrl, 'No seeded shops available');

      await page.goto(shopUrl);
      await page.waitForLoadState('networkidle');

      // Should be in "following" state from previous test
      const unfollowBtn = page.getByRole('button', {
        name: 'Unfollow this shop',
      });
      await expect(unfollowBtn).toBeVisible({ timeout: 10_000 });

      await unfollowBtn.click();

      // After click, button label should revert to "Follow this shop"
      await expect(
        page.getByRole('button', { name: 'Follow this shop' })
      ).toBeVisible({ timeout: 10_000 });
    });
  }
);

unauthTest.describe(
  '@critical J41 — Follow requires authentication',
  () => {
    unauthTest(
      'unauthenticated user clicking follow is redirected to login',
      async ({ page }) => {
        const response = await page.request.get(
          '/api/shops?featured=true&limit=1'
        );
        const shops = await response.json();
        const shop = first(shops);
        unauthTest.skip(!shop, 'No seeded shops available');

        await page.goto(`/shops/${shop.id}/${shop.slug || shop.id}`);
        await page.waitForLoadState('networkidle');

        const followBtn = page.getByRole('button', {
          name: 'Follow this shop',
        });
        await unauthExpect(followBtn).toBeVisible({ timeout: 10_000 });

        await followBtn.click();

        // Auth wall redirects to /login
        await page.waitForURL(/\/login/, { timeout: 10_000 });
      }
    );
  }
);
