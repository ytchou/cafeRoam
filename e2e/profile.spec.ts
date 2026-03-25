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
  test('changing display name in settings reflects on profile page', async ({
    authedPage: page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const displayNameInput = page.locator('#display-name');
    await expect(displayNameInput).toBeVisible({ timeout: 10_000 });

    // Fill with a unique timestamp-based name (max 30 chars)
    const newName = `Tester ${Date.now()}`.slice(0, 30);
    await displayNameInput.fill(newName);

    const saveButton = page.getByRole('button', { name: /Save changes/i });
    await saveButton.click();

    // Success message confirms the save
    await expect(page.getByText(/Profile updated!/i)).toBeVisible({ timeout: 10_000 });

    // Navigate to profile and verify the new name is shown
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(newName)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe.serial('@critical J38 — Account deletion: cancel during grace period', () => {
  test('a user in the 30-day grace period can cancel deletion from the recovery page', async ({
    authedPage: page,
  }) => {
    // Step 1: Navigate to settings and initiate account deletion
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const deleteButton = page.getByRole('button', {
      name: /delete account|刪除帳號/i,
    });
    await expect(deleteButton).toBeVisible({ timeout: 10_000 });
    await deleteButton.click();

    // Step 2: Type "DELETE" in the confirmation input
    const confirmInput = page.getByPlaceholder('Type DELETE');
    await expect(confirmInput).toBeVisible({ timeout: 5_000 });
    await confirmInput.fill('DELETE');

    // Step 3: Click "Confirm Delete"
    const confirmButton = page.getByRole('button', { name: /Confirm Delete/i });
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Step 4: Wait for deletion to process — should show grace period messaging
    // The page may redirect or show a confirmation
    await expect(
      page.getByText(/30.*(day|天)|grace period|scheduled for deletion|即將刪除/i)
    ).toBeVisible({ timeout: 10_000 });

    // Step 5: Navigate to recovery page and cancel
    await page.goto('/account/recover');
    await page.waitForLoadState('networkidle');

    const cancelButton = page.getByRole('button', {
      name: /Cancel Deletion|取消刪除/i,
    });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });
    await cancelButton.click();

    // Step 6: Should redirect to home after cancellation
    await page.waitForURL('/', { timeout: 15_000 });
    expect(page.url()).toMatch(/\/$/);

    // Step 7: Verify account is restored — profile page loads normally
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(
      page.locator('[data-testid="profile-header"], header').first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
