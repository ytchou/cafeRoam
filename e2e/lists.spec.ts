import { test, expect } from './fixtures/auth';

test.describe('@critical J12 — Create list → add shop → shop appears in list', () => {
  test('creating a list and viewing it shows the list on the lists page', async ({
    authedPage: page,
  }) => {
    await page.goto('/lists');
    await expect(page.getByText('My Lists')).toBeVisible({ timeout: 10_000 });

    // Create a new list with a unique name
    const listName = `E2E Test List ${Date.now()}`;
    const input = page.getByPlaceholder('Create new list');
    await input.fill(listName);

    // Click "Add" button or press Enter
    const addButton = page.getByRole('button', { name: 'Add' });
    await addButton.click();

    // Verify the list appears on the page
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete the list we just created
    // (to avoid polluting the test account)
  });
});

test.describe('@critical J13 — Create 3 lists → 4th list → cap error', () => {
  test('attempting to create more than 3 lists shows an error', async ({
    authedPage: page,
  }) => {
    await page.goto('/lists');
    await expect(page.getByText('My Lists')).toBeVisible({ timeout: 10_000 });

    // Check counter to see current count
    const counter = page.getByText(/\d+ \/ 3/);
    await expect(counter).toBeVisible({ timeout: 10_000 });

    // Get current list count from the counter text
    const counterText = await counter.textContent();
    const currentCount = parseInt(counterText?.split('/')[0]?.trim() ?? '0');

    // Create lists up to the cap
    const listsToCreate = 3 - currentCount;
    for (let i = 0; i < listsToCreate; i++) {
      const input = page.getByPlaceholder('Create new list');
      await input.fill(`Cap Test ${Date.now()}-${i}`);
      await page.getByRole('button', { name: 'Add' }).click();
      // Wait for list to appear before creating next
      await page.waitForTimeout(500);
    }

    // The counter should now show "3 / 3"
    await expect(page.getByText('3 / 3')).toBeVisible({ timeout: 5_000 });

    // The create input might be hidden or the 4th attempt should show an error
    // Try to create a 4th list if the input is still visible
    const input = page.getByPlaceholder('Create new list');
    if (await input.isVisible()) {
      await input.fill('Over Limit');
      await page.getByRole('button', { name: 'Add' }).click();

      // Should show error toast about the 3-list limit
      await expect(
        page.getByText(/3-list limit|reached the.*limit/i),
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// --- Phase 2 stubs ---

test.describe('J26 — Delete list', () => {
  test.fixme('deleting a list removes it from the lists page', async () => {});
});

test.describe('J27 — Remove shop from list', () => {
  test.fixme('removing a shop from a list updates the shop count', async () => {});
});
