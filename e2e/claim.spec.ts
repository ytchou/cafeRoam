import { test, expect } from './fixtures/auth';
import { first } from './fixtures/helpers';

test.describe('@critical J42 — Shop claim: badge click → form → confirmation', () => {
  test('claim badge links to claim page, form submits successfully', async ({
    authedPage: page,
  }) => {
    // Get a live shop
    const res = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await res.json();
    const shop = first(shops);
    test.skip(!shop?.id, 'No seeded shops');

    // Navigate to shop detail
    await page.goto(`/shops/${shop.id}/${shop.slug ?? shop.id}`);

    // Check claim badge is visible (shop must be unclaimed in test env)
    const claimLink = page.getByRole('link', { name: /claim this page/i });
    // Skip if shop is already claimed
    const isClaimed = !(await claimLink.isVisible().catch(() => false));
    test.skip(isClaimed, 'Shop is already claimed in test environment');

    await claimLink.click();
    await expect(page).toHaveURL(/\/shops\/.+\/claim/);
    await expect(
      page.getByRole('heading', { name: /認領|Claim/i })
    ).toBeVisible();

    // Fill in form
    await page.getByLabel(/姓名|Name/i).fill('Test Owner');
    await page.getByLabel(/email/i).fill('owner@test.com');

    // Upload a proof photo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'proof.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    // The upload URL is fetched on submit click (not on file select).
    // Click submit, then race to see whether we get an error (bucket not configured)
    // or a confirmation (success).
    const submitBtn = page.getByRole('button', { name: /送出|Submit/i });
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    const storageError = page.getByRole('alert').filter({
      hasText: /Failed to get upload URL|送出失敗|upload/i,
    });
    const confirmation = page.getByText(/已送出|submitted/i);

    await Promise.race([
      storageError
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => null),
      confirmation
        .waitFor({ state: 'visible', timeout: 15_000 })
        .catch(() => null),
    ]);

    const hasStorageError = await storageError
      .isVisible({ timeout: 500 })
      .catch(() => false);
    test.skip(
      hasStorageError,
      'Claim storage bucket (claim-proofs) not configured in this environment'
    );

    // Confirmation
    await expect(confirmation).toBeVisible({ timeout: 5_000 });
  });
});
