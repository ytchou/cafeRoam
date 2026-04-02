import { test, expect } from './fixtures/auth';
import { test as unauthTest } from '@playwright/test';
import { first } from './fixtures/helpers';

// Per-project auth storage — mirrors the per-project split in fixtures/auth.ts
function authStorage(projectName: string): string {
  const project = projectName === 'desktop' ? 'desktop' : 'mobile';
  return new URL(`.auth/user-${project}.json`, import.meta.url).pathname;
}

test.describe.serial('@critical J40 — Follow/unfollow toggle', () => {
  let shopUrl: string;
  let shopId: string;

  test.beforeAll(async ({ browser }, workerInfo) => {
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

    // Ensure clean "not following" baseline. The proxy only forwards the Authorization
    // header (not cookies), so we must extract the JWT from the Supabase session cookie
    // and add it explicitly to the DELETE request.
    if (shopId) {
      let authCtx;
      try {
        authCtx = await browser.newContext({
          storageState: authStorage(workerInfo.project.name),
        });
        const authPage = await authCtx.newPage();
        try {
          const cookies = await authPage
            .context()
            .cookies('http://localhost:3000');
          const authCookie = cookies.find(
            (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
          );
          if (authCookie) {
            const base64Val = authCookie.value.replace(/^base64-/, '');
            const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
            const token = (JSON.parse(decoded) as { access_token?: string })
              .access_token;
            if (token) {
              await authPage.request
                .delete(`/api/shops/${shopId}/follow`, {
                  headers: { Authorization: `Bearer ${token}` },
                })
                .catch(() => null);
            }
          }
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

  test.afterAll(async ({ browser }, workerInfo) => {
    if (!shopId) return;
    let authCtx;
    try {
      authCtx = await browser.newContext({
        storageState: authStorage(workerInfo.project.name),
      });
      const authPage = await authCtx.newPage();
      try {
        const cookies = await authPage
          .context()
          .cookies('http://localhost:3000');
        const authCookie = cookies.find(
          (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
        );
        const base64Val = authCookie?.value.replace(/^base64-/, '') ?? '';
        const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
        const token = base64Val
          ? ((JSON.parse(decoded) as { access_token?: string }).access_token ??
            null)
          : null;
        if (token) {
          await authPage.request
            .delete(`/api/shops/${shopId}/follow`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => null);
        }
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

    const followBtn = page.getByRole('button', { name: 'Follow this shop' });
    const unfollowBtn = page.getByRole('button', {
      name: 'Unfollow this shop',
    });

    await expect(followBtn).toBeEnabled({ timeout: 5_000 });
    await followBtn.click();
    await expect(unfollowBtn).toBeVisible({ timeout: 8_000 });
  });

  test('unfollowing the shop reverts button to "Follow this shop"', async ({
    authedPage: page,
  }) => {
    test.skip(!shopUrl, 'No seeded shops available');

    // Re-follow via API before navigating: mobile and desktop serial suites run
    // in parallel using the same test account, so the mobile unfollow test may
    // have already unfollowed by the time this desktop test runs.
    await page.request.post(`/api/shops/${shopId}/follow`).catch(() => null);

    await page.goto(shopUrl);
    await page.waitForLoadState('networkidle');

    const followBtn = page.getByRole('button', { name: 'Follow this shop' });
    const unfollowBtn = page.getByRole('button', {
      name: 'Unfollow this shop',
    });

    // Mobile and desktop serial suites run in parallel with a shared test account.
    // Use toPass() to retry the follow-then-unfollow flow until it completes
    // without interference from the concurrent project.
    await expect(async () => {
      // Step 1: Ensure we are in "following" state (follow if not already)
      const following = await unfollowBtn
        .isVisible({ timeout: 1_000 })
        .catch(() => false);
      if (!following) {
        // Wait for button to be enabled (SWR initial fetch may still be loading)
        await expect(followBtn).toBeEnabled({ timeout: 5_000 });
        await followBtn.click();
        await expect(unfollowBtn).toBeVisible({ timeout: 8_000 });
      }

      // Step 2: Unfollow the shop
      await unfollowBtn.click();

      // Step 3: Verify reverted to "Follow" state
      await expect(followBtn).toBeVisible({ timeout: 8_000 });
    }).toPass({ timeout: 30_000 });
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
