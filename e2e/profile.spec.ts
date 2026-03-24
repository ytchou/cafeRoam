import { test, expect } from './fixtures/auth';

test.describe('@critical J14 — Profile: stamp collection + check-in history', () => {
  test('logged-in user sees their stamp passport and check-in count on /profile', async ({
    authedPage: page,
  }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Profile header should be visible with check-in count
    await expect(
      page.locator('[data-testid="profile-header"], header').first()
    ).toBeVisible({ timeout: 10_000 });

    // Stamp/polaroid section should render (even if empty for new users)
    await expect(
      page
        .locator(
          '[data-testid="polaroid-section"], [class*="polaroid"], [class*="stamp"]'
        )
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('@critical J15 — Account deletion: request → grace period state', () => {
  test('requesting account deletion shows 30-day grace period confirmation', async ({
    authedPage: page,
  }) => {
    await page.goto('/profile');

    // Navigate to settings where deletion is initiated
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Delete account button or danger zone should be present
    const deleteButton = page.getByRole('button', {
      name: /delete account|刪除帳號/i,
    });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });

    // Click to initiate deletion — should show confirmation dialog
    await deleteButton.click();

    // Confirmation dialog or grace period messaging should appear
    await expect(
      page.getByText(/30.*(day|天)|grace period|grace/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});

// --- Phase 2 stubs ---

test.describe('J25 — Display name update', () => {
  test.fixme('changing display name in settings reflects on profile page', async () => {});
});

test.describe('J38 — Account deletion: cancel during grace period', () => {
  test.fixme('a user in the 30-day grace period can cancel deletion from the recovery page', async () => {});
});
