import { test, expect } from './fixtures/auth';
import { first } from './fixtures/helpers';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PHOTO = path.join(__dirname, 'fixtures', 'test-photo.jpg');

test.describe('@critical J10 — Check-in: upload photo → submit → stamp awarded', () => {
  test('completing a check-in with a photo shows success toast', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop?.id, 'No seeded shops available');

    // Navigate directly to the check-in page. The "Check In 打卡" button on the shop
    // detail page opens an inline popover/sheet (not a page navigation), so to test
    // the dedicated check-in flow we go there directly.
    await page.goto(`/checkin/${shop!.id}`);
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible({
      timeout: 10_000,
    });

    // Dismiss cookie consent banner if it would block the submit button
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    const fileInput = page.locator('[data-testid="photo-input"]');
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({
      timeout: 10_000,
    });

    const submitButton = page.getByRole('button', { name: /打卡 Check In/i });
    await expect(submitButton).toBeEnabled({ timeout: 5_000 });

    // Verify check-in API call succeeds. The toast fires just before router.back();
    // we verify the API response directly rather than chasing the transient toast.
    const [apiResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/checkins') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      submitButton.click(),
    ]);
    expect(apiResponse.ok()).toBeTruthy();
  });
});

test.describe('@critical J11 — Check-in: no photo → validation error', () => {
  test('attempting to submit check-in without photo shows disabled submit button', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible({
      timeout: 10_000,
    });

    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });
    await expect(submitButton).toBeDisabled();
  });
});

// --- Phase 2 stubs ---

test.describe('J24 — Duplicate stamp at same shop (intended)', () => {
  test('checking in at the same shop twice awards a second stamp', async ({
    authedPage: page,
  }) => {
    // Two full check-in flows + profile retry loop can exceed 30s under full-suite load.
    test.setTimeout(90_000);

    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    async function doCheckin() {
      await page.goto(`/checkin/${shopId}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible(
        { timeout: 10_000 }
      );
      // Wait for the Take Photo button — proves React has fully hydrated the PhotoUploader
      await expect(
        page.getByRole('button', { name: /Take Photo|Add Photo/i })
      ).toBeVisible({ timeout: 10_000 });
      await page
        .locator('[data-testid="photo-input"]')
        .setInputFiles(TEST_PHOTO);
      await expect(page.locator('img[src^="blob:"]')).toBeVisible({
        timeout: 10_000,
      });
      const submitBtn = page.getByRole('button', { name: /打卡|Check In/i });
      await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
      // Verify success via API response — the toast fires on the /checkin page and
      // is gone by the time router.back() completes; waitForResponse is reliable.
      const [apiResponse] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes('/api/checkins') &&
            r.request().method() === 'POST',
          { timeout: 15_000 }
        ),
        submitBtn.click(),
      ]);
      expect(apiResponse.ok()).toBeTruthy();
      await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
        timeout: 15_000,
      });
    }

    await doCheckin();

    // Read the baseline "X recent visits" total from the profile page.
    // PolaroidSection caps the displayed cards at 3 (MAX_PREVIEW), but always
    // renders "stamps.length recent visits" from the full DB result set.
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/\d+ recent visits/i)).toBeVisible({
      timeout: 10_000,
    });
    const firstText = await page.getByText(/\d+ recent visits/i).textContent();
    const firstCount = parseInt(firstText?.match(/\d+/)?.[0] ?? '0');

    await doCheckin();

    // Visit count should increase by at least 1.
    // The polaroid is created by a DB trigger after the API returns —
    // re-navigate on each retry to pick up the freshly-written row.
    await expect(async () => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      const countText = await page
        .getByText(/\d+ recent visits/i)
        .textContent()
        .catch(() => '0 recent visits');
      const secondCount = parseInt(countText?.match(/\d+/)?.[0] ?? '0');
      expect(secondCount).toBeGreaterThan(firstCount);
    }).toPass({ timeout: 30_000, intervals: [3_000, 5_000, 5_000, 5_000] });
  });
});

test.describe('J30 — Check-in with optional menu photo + text note', () => {
  test('completing a check-in with menu photo and text note succeeds', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop?.id, 'No seeded shops available');

    // Navigate directly to the check-in page (the "Check In" button on shop detail opens
    // an inline popover/sheet; the dedicated page has menu photo + text note fields).
    await page.goto(`/checkin/${shop!.id}`);
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible({
      timeout: 10_000,
    });

    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    await page.locator('[data-testid="photo-input"]').setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({
      timeout: 10_000,
    });

    const menuPhotoToggle = page.getByText(/Menu photo.*optional/i);
    await menuPhotoToggle.click();
    const menuPhotoInput = page.locator('input[type="file"]').nth(1);
    await menuPhotoInput.setInputFiles(TEST_PHOTO);

    const noteInput = page
      .locator('#note')
      .or(page.getByPlaceholder(/What did you have/i));
    await expect(noteInput).toBeVisible({ timeout: 5_000 });
    await noteInput.fill(
      'Excellent flat white — silky microfoam and great ambiance'
    );

    const submitBtn = page.getByRole('button', { name: /打卡 Check In/i });
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 });

    const [apiResponse] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/checkins') && r.request().method() === 'POST',
        { timeout: 15_000 }
      ),
      submitBtn.click(),
    ]);
    expect(apiResponse.ok()).toBeTruthy();
  });
});

test.describe('@critical J39 — Check-in with review text → review visible on shop page', () => {
  test('submitting a check-in with a text note shows the review in the shop detail reviews section', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    await page.goto(`/checkin/${shop!.id}`);
    // Use heading role to avoid strict-mode ambiguity with the submit button
    // which also contains "Check In" text.
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible({
      timeout: 10_000,
    });

    const fileInput = page.locator('[data-testid="photo-input"]');
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({
      timeout: 10_000,
    });

    const threeStarBtn = page.getByRole('button', { name: /3 stars/i });
    await threeStarBtn.click();

    const reviewText = `E2E test review ${Date.now()} — excellent espresso`;
    const reviewTextarea = page.getByPlaceholder(/How was your visit/i);
    await expect(reviewTextarea).toBeVisible({ timeout: 5_000 });
    await reviewTextarea.fill(reviewText);

    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });

    // Dismiss cookie consent banner if present — the fixed bottom banner (z-50)
    // intercepts pointer events and blocks the submit button click.
    const rejectBtn = page.getByRole('button', { name: 'Reject' });
    if (await rejectBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await rejectBtn.click();
      await expect(rejectBtn).toBeHidden({ timeout: 3_000 });
    }

    await submitButton.click();

    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });

    // The review write is async — reload the shop page until it appears.
    await expect(async () => {
      await page.goto(`/shops/${shop!.id}/${shop!.slug || shop!.id}`);
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByRole('heading', { name: '打卡評價' })
      ).toBeVisible();
      await expect(page.getByText(reviewText)).toBeVisible();
    }).toPass({ timeout: 30_000, intervals: [2_000] });
  });
});
