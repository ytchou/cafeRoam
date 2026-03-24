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
  test.fixme('checking in at the same shop twice awards a second stamp', async () => {});
});

test.describe('J30 — Check-in with optional menu photo + text note', () => {
  test.fixme('completing a check-in with menu photo and text note succeeds', async () => {});
});

test.describe('J39 — Check-in with review text → review visible on shop page', () => {
  test.fixme('submitting a check-in with a text note shows the review in the shop detail reviews section', async () => {});
});
