import { test, expect } from './fixtures/auth';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PHOTO = path.join(__dirname, 'fixtures', 'test-photo.jpg');

test.describe('@critical J10 — Check-in: upload photo → submit → stamp awarded', () => {
  test('completing a check-in with a photo shows success toast', async ({
    authedPage: page,
  }) => {
    // Navigate to a shop page to get a valid shop ID
    // Use the API to find a shop
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = shops[0]?.id;
    test.skip(!shopId, 'No seeded shops available');

    // Go to check-in page for this shop
    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

    // Upload a test photo
    const fileInput = page.locator('[data-testid="photo-input"]');
    await fileInput.setInputFiles(TEST_PHOTO);

    // Wait for photo preview — blob: URL is specific to client-side file upload previews
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({
      timeout: 10_000,
    });

    // Submit the check-in
    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });
    await submitButton.click();

    // Wait for successful navigation away from check-in page
    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });
    // Verify success toast (Sonner toasts use data-sonner-toast attribute)
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({
      timeout: 5_000,
    });
  });
});

test.describe('@critical J11 — Check-in: no photo → validation error', () => {
  test('attempting to submit check-in without photo shows disabled submit button', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = shops[0]?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

    // Submit button should be disabled when no photo is uploaded
    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });
    await expect(submitButton).toBeDisabled();
  });
});

// --- Phase 2 stubs ---

test.describe('J24 — Duplicate stamp at same shop (intended)', () => {
  test('checking in at the same shop twice awards a second stamp', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = shops[0]?.id;
    test.skip(!shopId, 'No seeded shops available');

    async function doCheckin() {
      await page.goto(`/checkin/${shopId}`);
      await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });
      await page.locator('[data-testid="photo-input"]').setInputFiles(TEST_PHOTO);
      await expect(page.locator('img[src^="blob:"]')).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /打卡|Check In/i }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), { timeout: 15_000 });
    }

    // First check-in
    await doCheckin();

    // Check stamp count on profile after first check-in
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const stamps = page.locator('[data-testid="memory-scroll"] [class*="polaroid"], [class*="stamp"]');
    const firstCount = await stamps.count();

    // Second check-in at the same shop (duplicate stamps are the intended mechanic)
    await doCheckin();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 });

    // Stamp count should have increased by at least 1
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(async () => {
      const secondCount = await stamps.count();
      expect(secondCount).toBeGreaterThan(firstCount);
    }).toPass({ timeout: 10_000 });
  });
});

test.describe('J30 — Check-in with optional menu photo + text note', () => {
  test('completing a check-in with menu photo and text note succeeds', async ({
    authedPage: page,
  }) => {
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shopId = shops[0]?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

    // Upload main photo (required)
    await page.locator('[data-testid="photo-input"]').setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({ timeout: 10_000 });

    // Expand the optional menu photo section and upload
    const menuPhotoToggle = page.getByText(/Menu photo.*optional/i);
    await menuPhotoToggle.click();
    // Second file input appears after expanding the menu photo section
    const menuPhotoInput = page.locator('input[type="file"]').nth(1);
    await menuPhotoInput.setInputFiles(TEST_PHOTO);

    // Fill in the optional text note
    const noteInput = page
      .locator('#note')
      .or(page.getByPlaceholder(/What did you have/i));
    await expect(noteInput).toBeVisible({ timeout: 5_000 });
    await noteInput.fill('Excellent flat white — silky microfoam and great ambiance');

    // Submit the check-in
    await page.getByRole('button', { name: /打卡|Check In/i }).click();

    // Should navigate away and show success toast
    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), { timeout: 15_000 });
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('@critical J39 — Check-in with review text → review visible on shop page', () => {
  test('submitting a check-in with a text note shows the review in the shop detail reviews section', async ({
    authedPage: page,
  }) => {
    // Get a seeded shop
    const response = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await response.json();
    const shop = shops[0];
    test.skip(!shop, 'No seeded shops available');

    // Navigate to check-in page
    await page.goto(`/checkin/${shop.id}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

    // Upload a test photo (required for check-in)
    const fileInput = page.locator('[data-testid="photo-input"]');
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({ timeout: 10_000 });

    // Give a star rating (required before review text textarea appears)
    const threeStarBtn = page.getByRole('button', { name: /3 stars/i });
    await threeStarBtn.click();

    // Fill in the review text with a distinctive string
    const reviewText = `E2E test review ${Date.now()} — excellent espresso`;
    const reviewTextarea = page.getByPlaceholder(/How was your visit/i);
    await expect(reviewTextarea).toBeVisible({ timeout: 5_000 });
    await reviewTextarea.fill(reviewText);

    // Submit the check-in
    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });
    await submitButton.click();

    // Wait for navigation away from check-in page
    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });

    // Navigate to the shop detail page
    await page.goto(`/shops/${shop.id}/${shop.slug || ''}`);
    await page.waitForLoadState('networkidle');

    // Scroll to the reviews section — "打卡評價" heading
    const reviewsHeading = page.getByRole('heading', { name: '打卡評價' });
    await expect(reviewsHeading).toBeVisible({ timeout: 10_000 });

    // Assert the review text we just submitted is visible on the page
    await expect(page.getByText(reviewText)).toBeVisible({ timeout: 10_000 });
  });
});
