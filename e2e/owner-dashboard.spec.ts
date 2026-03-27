import { test, expect } from './fixtures/auth';
import { test as unauthTest } from '@playwright/test';

// TODO: requires E2E_CLAIMED_SHOP_ID seeded shop — a shop with an approved claim
// owned by the E2E_USER_EMAIL account. Seed this in the test environment before running.
const SHOP_ID = process.env.E2E_CLAIMED_SHOP_ID!;

test.describe('@critical J50 — Owner dashboard: verified owner views stats and edits story', () => {
  test('verified owner can view stat tiles and publish a shop story', async ({
    authedPage: page,
  }) => {
    test.skip(
      !SHOP_ID,
      'E2E_CLAIMED_SHOP_ID not set — skipping owner dashboard tests'
    );

    await page.goto(`/owner/${SHOP_ID}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Stat tiles should be visible
    await expect(page.getByText(/訪客數/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/打卡/)).toBeVisible({ timeout: 10_000 });

    // Edit shop story
    const storyTextarea = page.getByRole('textbox', {
      name: /story|故事|介紹/i,
    });
    await expect(storyTextarea).toBeVisible({ timeout: 10_000 });
    await storyTextarea.fill('這是一間充滿溫度的獨立咖啡廳，歡迎來坐坐。');

    // Publish
    const publishBtn = page.getByRole('button', {
      name: /publish|發佈|儲存|save/i,
    });
    await expect(publishBtn).toBeEnabled({ timeout: 3_000 });
    await publishBtn.click();

    // Confirmation feedback
    await expect(page.getByText(/saved|已儲存|成功/i)).toBeVisible({
      timeout: 10_000,
    });

    // Verify the story appears on the public shop page under "From the Owner"
    await page.goto(`/shops/${SHOP_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/from the owner|來自店主/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByText('這是一間充滿溫度的獨立咖啡廳，歡迎來坐坐。')
    ).toBeVisible({ timeout: 10_000 });
  });
});

unauthTest.describe(
  '@critical J51 — Owner dashboard: unauthenticated user is redirected',
  () => {
    unauthTest(
      'unauthenticated user visiting the owner dashboard is redirected to login',
      async ({ page }) => {
        unauthTest.skip(
          !SHOP_ID,
          'E2E_CLAIMED_SHOP_ID not set — skipping redirect test'
        );

        await page.goto(`/owner/${SHOP_ID}/dashboard`);
        await page.waitForURL(/\/login/, { timeout: 10_000 });
      }
    );
  }
);
