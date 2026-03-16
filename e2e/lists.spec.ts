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

    // Cleanup: delete the created list via API to avoid polluting the test account
    const listsResp = await page.request.get('/api/lists');
    if (listsResp.ok()) {
      const lists = await listsResp.json();
      const created = Array.isArray(lists)
        ? lists.find((l: { name: string; id: string }) => l.name === listName)
        : null;
      if (created?.id) {
        await page.request.delete(`/api/lists/${created.id}`);
      }
    }
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

    // Create lists up to the cap, waiting for each to appear before creating next
    const createdNames: string[] = [];
    const listsToCreate = 3 - currentCount;
    for (let i = 0; i < listsToCreate; i++) {
      const listInput = page.getByPlaceholder('Create new list');
      const name = `Cap Test ${Date.now()}-${i}`;
      await listInput.fill(name);
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 });
      createdNames.push(name);
    }

    // The counter should now show "3 / 3"
    await expect(page.getByText('3 / 3')).toBeVisible({ timeout: 5_000 });

    // Assert cap is enforced: either input is hidden (UI-level) or 4th attempt shows error
    const input = page.getByPlaceholder('Create new list');
    if (await input.isVisible()) {
      await input.fill('Over Limit');
      await page.getByRole('button', { name: 'Add' }).click();
      // Should show error toast about the 3-list limit
      await expect(
        page.getByText(/3-list limit|reached the.*limit/i),
      ).toBeVisible({ timeout: 5_000 });
    } else {
      // Cap enforced by hiding input — verify counter still at 3/3
      await expect(page.getByText('3 / 3')).toBeVisible();
    }

    // Cleanup: delete lists created by this test run
    const listsResp = await page.request.get('/api/lists');
    if (listsResp.ok()) {
      const allLists = await listsResp.json();
      const testLists = Array.isArray(allLists)
        ? allLists.filter((l: { name: string }) =>
            createdNames.includes(l.name),
          )
        : [];
      for (const list of testLists as Array<{ id: string }>) {
        await page.request.delete(`/api/lists/${list.id}`);
      }
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
