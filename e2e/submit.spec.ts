import { test, expect } from './fixtures/auth';

// Generate a unique-per-run Google Maps URL to avoid cross-run collisions.
// The backend validates the URL prefix matches Google Maps domains.
const uniqueUrl = `https://maps.app.goo.gl/e2eTest${Date.now()}`;

test.describe.serial('@critical J40 — Community shop submission', () => {
  test('authenticated user submits a shop URL and sees confirmation', async ({
    authedPage: page,
  }) => {
    await page.goto('/submit');

    // Page heading visible
    await expect(page.getByText('推薦咖啡廳')).toBeVisible({ timeout: 10_000 });

    // Fill in the URL
    const urlInput = page.getByPlaceholder('貼上 Google Maps 連結');
    await urlInput.fill(uniqueUrl);

    // Submit
    const submitButton = page.getByRole('button', { name: '送出' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success message
    await expect(page.getByText('感謝推薦！我們正在處理中。')).toBeVisible({
      timeout: 10_000,
    });

    // Verify submission appears in history with "處理中" badge
    await expect(page.getByText('我的推薦紀錄')).toBeVisible();
    await expect(page.getByText(uniqueUrl)).toBeVisible();
    await expect(page.getByText('處理中').first()).toBeVisible();
  });
});
