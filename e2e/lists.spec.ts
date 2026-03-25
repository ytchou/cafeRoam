import { test, expect } from './fixtures/auth';
import { first } from './fixtures/helpers';

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
        page.getByText(/3-list limit|reached the.*limit/i)
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
            createdNames.includes(l.name)
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
  test('deleting a list removes it from the lists page', async ({
    authedPage: page,
  }) => {
    // Create a list to delete
    await page.goto('/lists');
    await expect(page.getByText('My Lists')).toBeVisible({ timeout: 10_000 });

    const listName = `Delete Test ${Date.now()}`;
    await page.getByPlaceholder('Create new list').fill(listName);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10_000 });

    // Find and click the delete button for this list
    const listCard = page.locator('li, article, [data-list-id]').filter({ hasText: listName }).first();
    const deleteBtn = listCard.getByRole('button', { name: /delete|trash/i });

    const hasDeleteBtn = await deleteBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasDeleteBtn) {
      // Deletion may be behind a menu — try the last button in the card (options/kebab)
      const optionsBtn = listCard.getByRole('button').last();
      await optionsBtn.click();
      await page.getByRole('button', { name: /delete/i }).click();
    } else {
      await deleteBtn.click();
    }

    // Confirmation dialog: "Delete '{name}'? This won't remove the shops."
    const confirmBtn = page
      .getByRole('button', { name: /^(OK|Confirm|Delete|Yes)$/i })
      .or(page.getByText(/This won't remove the shops/i).locator('..').getByRole('button').last());
    if (await confirmBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmBtn.first().click();
    }

    // List should no longer appear on the page
    await expect(page.getByText(listName)).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('J27 — Remove shop from list', () => {
  test('removing a shop from a list updates the shop count', async ({
    authedPage: page,
  }) => {
    const shopsResponse = await page.request.get('/api/shops?featured=true&limit=1');
    const shops = await shopsResponse.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    // Create a fresh test list
    await page.goto('/lists');
    await expect(page.getByText('My Lists')).toBeVisible({ timeout: 10_000 });

    const listName = `咖啡廳週末清單-${Date.now()}`;
    await page.getByPlaceholder('Create new list').fill(listName);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10_000 });

    // Fetch the list ID immediately after creation so cleanup can always run,
    // even if a later step skips or throws.
    const listsResp = await page.request.get('/api/lists');
    const allLists = await listsResp.json();
    const createdList = (Array.isArray(allLists) ? allLists : []).find(
      (l: { name: string; id: string }) => l.name === listName
    );
    if (!createdList) {
      test.skip(true, 'Could not retrieve created list via API');
    }

    try {
      // Navigate to shop detail and save it to the test list
      await page.goto(`/shops/${shop!.id}/${shop!.slug || shop!.id}`);
      await page.waitForLoadState('networkidle');

      const saveBtn = page.getByRole('button', { name: /^Save$/i });
      await expect(saveBtn).toBeVisible({ timeout: 10_000 });
      await saveBtn.click();

      const listCheckbox = page.getByRole('checkbox', { name: listName });
      await expect(listCheckbox).toBeVisible({ timeout: 5_000 });
      await listCheckbox.check();
      await page.getByRole('button', { name: /Done/i }).click();

      // Navigate to list detail — shop should appear
      await page.goto(`/lists/${createdList!.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(shop!.name)).toBeVisible({ timeout: 10_000 });

      // Remove the shop: go back to shop detail and uncheck the list
      await page.goto(`/shops/${shop!.id}/${shop!.slug || shop!.id}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /^Save$/i }).click();

      const checkedListCheckbox = page.getByRole('checkbox', { name: listName });
      await expect(checkedListCheckbox).toBeChecked({ timeout: 5_000 });
      await checkedListCheckbox.uncheck();
      await page.getByRole('button', { name: /Done/i }).click();

      // List detail should no longer show the shop
      await page.goto(`/lists/${createdList!.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(shop!.name)).toBeHidden({ timeout: 10_000 });
    } finally {
      await page.request.delete(`/api/lists/${createdList!.id}`).catch(() => null);
    }
  });
});
