import { test, expect } from './fixtures/auth';

// Generate unique-per-project URL to avoid collisions when mobile + desktop run in parallel.
// Module-scope Date.now() would evaluate at ~same millisecond across two worker processes.
let uniqueUrl: string;

test.describe.serial('@critical J43 — Community shop submission', () => {
  test.beforeAll(async ({}, workerInfo) => {
    uniqueUrl = `https://maps.app.goo.gl/e2eTest${workerInfo.project.name}-${Date.now()}`;
  });

  test('authenticated user submits a shop URL and sees confirmation', async ({
    authedPage: page,
  }) => {
    await page.goto('/submit');

    // Page heading visible
    // Use heading role to avoid matching the footer nav link with the same text
    await expect(page.getByRole('heading', { name: '推薦咖啡廳' })).toBeVisible(
      { timeout: 10_000 }
    );

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

  test('submitting a duplicate URL shows error', async ({
    authedPage: page,
  }) => {
    await page.goto('/submit');

    // Submit the same URL that was submitted in the happy path test
    const urlInput = page.getByPlaceholder('貼上 Google Maps 連結');
    await urlInput.fill(uniqueUrl);

    const submitButton = page.getByRole('button', { name: '送出' });
    await submitButton.click();

    // Error message should appear (409 duplicate from backend)
    await expect(
      page.getByText('This URL has already been submitted')
    ).toBeVisible({ timeout: 10_000 });

    // URL input should NOT be cleared (form preserved on error)
    await expect(urlInput).toHaveValue(uniqueUrl);

    // Success message should NOT appear
    await expect(page.getByText('感謝推薦！我們正在處理中。')).toBeHidden();
  });

  test('invalid URL shows inline validation error without network request', async ({
    authedPage: page,
  }) => {
    await page.goto('/submit');

    const urlInput = page.getByPlaceholder('貼上 Google Maps 連結');
    // Must be a syntactically valid URL (passes browser type="url") but not a
    // Google Maps URL so MAPS_URL_PATTERN rejects it and the React error fires.
    await urlInput.fill('https://example.com/not-a-maps-url');

    // Submit button should be enabled (url is non-empty)
    const submitButton = page.getByRole('button', { name: '送出' });
    await expect(submitButton).toBeEnabled();

    // Intercept to verify no network request is made
    let apiCalled = false;
    await page.route('**/api/submissions', (route) => {
      if (route.request().method() === 'POST') apiCalled = true;
      return route.continue();
    });

    await submitButton.click();

    // Inline validation error should appear
    await expect(page.getByText('請輸入有效的 Google Maps 連結')).toBeVisible();

    // No API call should have been made (client-side validation catches it)
    expect(apiCalled).toBe(false);

    await page.unroute('**/api/submissions');
  });
});
