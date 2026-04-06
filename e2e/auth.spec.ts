import { test, expect } from '@playwright/test';

test.describe('@critical J05 — Auth wall: protected routes redirect to login', () => {
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

  test('unauthenticated user can access the /find page without redirect', async ({
    page,
  }) => {
    // Map view lives at /find — publicly accessible, no auth required
    await page.goto('/find');
    await page.waitForLoadState('networkidle');
    // Should stay on /find (not redirected to /login)
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
