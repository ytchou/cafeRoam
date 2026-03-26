import { test, expect } from './fixtures/auth';
import { test as unauthTest } from '@playwright/test';
import { first } from './fixtures/helpers';

const authStorage = new URL('.auth/user.json', import.meta.url).pathname;

test.describe.serial('@critical J40 — Follow/unfollow toggle', () => {
  let shopUrl: string;
  let shopId: string;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const response = await page.request.get(
        '/api/shops?featured=true&limit=1'
      );
      const shops = await response.json();
      const shop = first(shops);
      if (shop) {
        shopId = shop.id;
        shopUrl = `/shops/${shop.id}/${shop.slug || shop.id}`;
      }
    } finally {
      await page.close();
      await ctx.close();
    }

    // Ensure clean "not following" baseline before the suite runs so serial
    // tests don't fail if the test account followed this shop in a prior run.
    if (shopId) {
      let authCtx;
      try {
        authCtx = await browser.newContext({ storageState: authStorage });
        const authPage = await authCtx.newPage();
        try {
          await authPage.request.delete(`/api/shops/${shopId}/follow`);
        } finally {
          await authPage.close();
        }
      } catch {
        // Auth state not yet written (.auth/user.json missing on first run) — tests will skip
      } finally {
        await authCtx?.close();
      }
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!shopId) return;
    let authCtx;
    try {
      authCtx = await browser.newContext({ storageState: authStorage });
      const authPage = await authCtx.newPage();
      try {
        await authPage.request.delete(`/api/shops/${shopId}/follow`);
      } finally {
        await authPage.close();
      }
    } catch {
      // Best-effort cleanup
    } finally {
      await authCtx?.close();
    }
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

    await expect(
      page.getByRole('button', { name: 'Follow this shop' })
    ).toBeVisible({ timeout: 10_000 });
  });
});

unauthTest.describe('@critical J41 — Follow requires authentication', () => {
  unauthTest(
    'unauthenticated user clicking follow is redirected to login',
    async ({ page }) => {
      const response = await page.request.get(
        '/api/shops?featured=true&limit=1'
      );
      const shops = await response.json();
      const shop = first(shops);
      unauthTest.skip(!shop, 'No seeded shops available');
      if (!shop) return;

      await page.goto(`/shops/${shop.id}/${shop.slug || shop.id}`);
      await page.waitForLoadState('networkidle');

      const followBtn = page.getByRole('button', {
        name: 'Follow this shop',
      });
      await expect(followBtn).toBeVisible({ timeout: 10_000 });

      await followBtn.click();

      await page.waitForURL(/\/login/, { timeout: 10_000 });
    }
  );
});
