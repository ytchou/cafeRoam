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
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

    const fileInput = page.locator('[data-testid="photo-input"]');
    await fileInput.setInputFiles(TEST_PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toBeVisible({
      timeout: 10_000,
    });

    const submitButton = page.getByRole('button', { name: /打卡|Check In/i });
    await submitButton.click();

    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });
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
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

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
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    async function doCheckin() {
      await page.goto(`/checkin/${shopId}`);
      await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });
      await page
        .locator('[data-testid="photo-input"]')
        .setInputFiles(TEST_PHOTO);
      await expect(page.locator('img[src^="blob:"]')).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole('button', { name: /打卡|Check In/i }).click();
      await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
        timeout: 15_000,
      });
    }

    await doCheckin();

    // Wait for at least one stamp to be visible before reading the baseline count —
    // the DB write is async and networkidle alone does not guarantee persistence.
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const stamps = page
      .locator('[data-testid="memory-scroll"]')
      .locator('[class*="polaroid"], [class*="stamp"]');
    await expect(stamps.first()).toBeVisible({ timeout: 10_000 });
    const firstCount = await stamps.count();

    await doCheckin();
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({
      timeout: 5_000,
    });

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
    const shopId = first(shops)?.id;
    test.skip(!shopId, 'No seeded shops available');

    await page.goto(`/checkin/${shopId}`);
    await expect(page.getByText('Check In')).toBeVisible({ timeout: 10_000 });

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

    await page.getByRole('button', { name: /打卡|Check In/i }).click();

    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({
      timeout: 5_000,
    });
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
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible({ timeout: 10_000 });

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
    await submitButton.click();

    await page.waitForURL((url) => !url.pathname.startsWith('/checkin'), {
      timeout: 15_000,
    });

    // The review write is async — reload the shop page until it appears.
    await expect(async () => {
      await page.goto(`/shops/${shop!.id}/${shop!.slug || shop!.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: '打卡評價' })).toBeVisible();
      await expect(page.getByText(reviewText)).toBeVisible();
    }).toPass({ timeout: 30_000, intervals: [2_000] });
  });
});
