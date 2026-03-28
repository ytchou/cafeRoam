import { test, expect } from './fixtures/auth';

// Generate unique-per-project URL to avoid collisions when mobile + desktop run in parallel.
// Module-scope Date.now() would evaluate at ~same millisecond across two worker processes.
let uniqueUrl: string;

// Per-project auth storage — mirrors the per-project split in fixtures/auth.ts
function authStoragePath(projectName: string): string {
  const project = projectName === 'desktop' ? 'desktop' : 'mobile';
  return new URL(`.auth/user-${project}.json`, import.meta.url).pathname;
}

async function cancelPendingDeletion(browser: import('@playwright/test').Browser, projectName: string) {
  // J38 (profile.spec.ts) marks the account for deletion as part of its test flow.
  // If J38 runs concurrently or a prior run left the account in deletion state,
  // submissions are rejected with "Account is pending deletion". Cancel it proactively.
  let authCtx;
  try {
    authCtx = await browser.newContext({ storageState: authStoragePath(projectName) });
    const authPage = await authCtx.newPage();
    try {
      await authPage.goto('/account/recover');
      await authPage.waitForLoadState('networkidle');
      const cancelBtn = authPage.getByRole('button', {
        name: /Cancel Deletion|取消刪除/i,
      });
      if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await cancelBtn.click();
        await authPage
          .waitForURL((url) => url.pathname === '/', { timeout: 10_000 })
          .catch(() => null);
      }
    } finally {
      await authPage.close();
    }
  } catch {
    // Best-effort — if auth state is absent (first run), skip silently
  } finally {
    await authCtx?.close();
  }
}

test.describe.serial('@critical J43 — Community shop submission', () => {
  test.beforeAll(async ({ browser }, workerInfo) => {
    uniqueUrl = `https://maps.app.goo.gl/e2eTest${workerInfo.project.name}-${Date.now()}`;
    await cancelPendingDeletion(browser, workerInfo.project.name);
  });

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

  test('submitting a duplicate URL shows error', async ({
    authedPage: page,
  }) => {
    // If a concurrent test (J38) left the account in pending-deletion state, cancel it
    // before proceeding — otherwise submissions are rejected with "Account is pending deletion"
    await page.goto('/account/recover');
    await page.waitForLoadState('networkidle');
    const cancelBtn = page.getByRole('button', { name: /Cancel Deletion|取消刪除/i });
    if (await cancelBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForURL((url) => url.pathname === '/', { timeout: 10_000 }).catch(() => null);
    }

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
