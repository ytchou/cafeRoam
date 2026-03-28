import { test, expect } from '@playwright/test';

test.describe('@critical J05 — Auth wall: protected routes redirect to login', () => {
  test('unauthenticated user accessing /search is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/search');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user accessing /lists is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/lists');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user accessing /checkin/:shopId is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/checkin/abc123');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user accessing /submit is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/submit');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('unauthenticated user can access the map/discovery page without redirect', async ({
    page,
  }) => {
    // /map redirects to / — map is embedded in the home page
    await page.goto('/map');
    await page.waitForLoadState('networkidle');
    // Should land on / (not /login)
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('@critical J06 — Signup → PDPA consent → reach home', () => {
  test('signup page shows PDPA consent checkbox that must be checked before submit', async ({
    page,
  }) => {
    await page.goto('/signup');

    // Verify PDPA consent checkbox exists
    const pdpaCheckbox = page.locator('#pdpa-consent');
    await expect(pdpaCheckbox).toBeVisible();

    // Submit button should be disabled without PDPA consent
    const submitButton = page.getByRole('button', { name: /註冊|Sign Up/i });
    await expect(submitButton).toBeDisabled();

    // Check PDPA consent — submit button should become enabled
    await pdpaCheckbox.check();
    await expect(submitButton).toBeEnabled();
  });
});
