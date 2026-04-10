import { test, expect } from './fixtures/auth';

test.describe('@critical J55/J56 — Preference onboarding modal', () => {
  test.skip(
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Preference onboarding E2E requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL'
  );

  test('J55 — fresh user can complete preference onboarding and is not prompted again', async ({
    deletionPage: page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: /what brings you here today/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Focus time' }).click();
    await page.getByRole('button', { name: /next/i }).click();

    const vibeChip = page
      .locator('[role="dialog"] button')
      .filter({ hasNotText: /next|skip|finish/i })
      .first();
    await expect(vibeChip).toBeVisible({ timeout: 10_000 });
    await vibeChip.click();
    await page.getByRole('button', { name: /next/i }).click();

    const noteInput = page.getByPlaceholder('A few words — totally optional');
    await expect(noteInput).toBeVisible({ timeout: 10_000 });
    await noteInput.fill('Quiet corners, comfortable seating, and a solid pour-over.');

    await page.getByRole('button', { name: /finish/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await page.reload();

    // Wait for the page to settle: either the modal appears (fail) or the shop list loads (pass).
    // Using a positive DOM assertion avoids networkidle / arbitrary timeouts.
    await expect(page.locator('[data-testid="shop-list"], main')).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: /what brings you here today/i })
    ).not.toBeVisible();
  });

  test('J56 — fresh user can dismiss preference onboarding and is not prompted again', async ({
    deletionPage: page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /what brings you here today/i })
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await page.reload();

    // Wait for the page to settle before asserting the modal is absent.
    await expect(page.locator('[data-testid="shop-list"], main')).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('heading', { name: /what brings you here today/i })
    ).not.toBeVisible();
  });
});
