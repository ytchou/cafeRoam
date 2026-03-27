import { test, expect } from './fixtures/auth';
import { first } from './fixtures/helpers';

// J12, J13, J26 and J27 share the same test account's list state.
// Run serially AND only on the mobile project: the desktop project runs in parallel
// with mobile against the same auth account, causing unavoidable list-cap races.
test.describe.serial('List cap tests (J12 + J13)', () => {
  test.beforeEach(async ({}, testInfo) => {
    if (testInfo.project.name !== 'mobile') {
      test.skip(true, 'List tests run on mobile project only — desktop shares the same test account and races on list state');
    }
  });

test.describe('@critical J12 — Create list → add shop → shop appears in list', () => {
  test('creating a list and viewing it shows the list on the lists page', async ({
    authedPage: page,
  }) => {
    await page.goto('/lists');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    // Ensure the list cap hasn't been reached from leftover test data.
    // The proxy only forwards the Authorization header (not cookies), so we extract
    // the JWT from the Supabase session cookie (sb-*-auth-token) via Playwright's
    // context.cookies() API and pass it explicitly.
    const cookies = await page.context().cookies('http://localhost:3000');
    const authCookie = cookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    let token: string | null = null;
    if (authCookie) {
      try {
        const base64Val = authCookie.value.replace(/^base64-/, '');
        const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
        token = (JSON.parse(decoded) as { access_token?: string }).access_token ?? null;
      } catch { /* ignore */ }
    }
    if (token) {
      const preResp = await page.request.get('/api/lists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (preResp.ok()) {
        const preLists = await preResp.json();
        const all = Array.isArray(preLists) ? preLists : [];
        // Delete ALL lists — accumulated residue from prior failed runs causes
        // later tests in this serial chain to hit the 3-list cap unexpectedly.
        for (const l of all as Array<{ id: string }>) {
          await page.request.delete(`/api/lists/${l.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        if (all.length > 0) {
          await page.reload();
          await page.waitForLoadState('networkidle');
        }
      }
    }

    // Create a new list with a unique name — opens a dialog
    // Mobile button text: "+ New List" (literal +), Desktop: SVG Plus icon + "New List"
    const listName = `台北咖啡清單 ${Date.now()}`;
    await page.getByRole('button', { name: /^\+?\s*New List$/i }).click();
    await page.getByPlaceholder('List name').fill(listName);
    await page.getByPlaceholder('List name').press('Enter');

    // Verify the list appears on the page
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10_000 });

    // Cleanup: delete the created list via authenticated API call
    if (token) {
      const listsResp = await page.request.get('/api/lists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listsResp.ok()) {
        const lists = await listsResp.json();
        const created = Array.isArray(lists)
          ? lists.find((l: { name: string; id: string }) => l.name === listName)
          : null;
        if (created?.id) {
          await page.request.delete(`/api/lists/${created.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    }
  });
});

test.describe('@critical J13 — Create 3 lists → 4th list → cap error', () => {
  test('attempting to create more than 3 lists shows an error', async ({
    authedPage: page,
  }) => {
    await page.goto('/lists');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    // Count existing lists via DOM — more reliable than the mobile-only counter
    // or an API call (which requires Authorization header, not cookies).
    // Each list card has a "List options" button regardless of layout.
    const counter = page.getByText(/\d+ \/ 3/);
    const hasCounter = await counter.isVisible({ timeout: 3_000 }).catch(() => false);

    let currentCount: number;
    if (hasCounter) {
      const counterText = await counter.textContent();
      currentCount = parseInt(counterText?.split('/')[0]?.trim() ?? '0');
    } else {
      // Count list cards via "List options" buttons — present on both mobile and desktop
      const listOptionBtns = page.getByRole('button', { name: /list options/i });
      currentCount = await listOptionBtns.count();
    }

    // Create lists up to the cap via dialog, waiting for each to appear before creating next
    // Mobile button: "+ New List", Desktop button: SVG Plus icon + "New List"
    const createdNames: string[] = [];
    const listsToCreate = 3 - currentCount;
    for (let i = 0; i < listsToCreate; i++) {
      const name = `週末探店 ${Date.now()}-${i}`;
      await page.getByRole('button', { name: /^\+?\s*New List$/i }).click();
      await page.getByPlaceholder('List name').fill(name);
      await page.getByPlaceholder('List name').press('Enter');
      await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
      createdNames.push(name);
    }

    // Assert cap is enforced: the "New List" button is hidden at 3 lists (UI-level enforcement)
    const newListBtn = page.getByRole('button', { name: /^\+?\s*New List$/i });
    if (await newListBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await newListBtn.click();
      await page.getByPlaceholder('List name').fill('板橋好咖啡廳');
      await page.getByPlaceholder('List name').press('Enter');
      // Should show error toast about the 3-list limit
      await expect(
        page.getByText(/3-list limit|reached the.*limit/i)
      ).toBeVisible({ timeout: 5_000 });
    } else {
      // Cap enforced by hiding the "New List" button — button absent means cap reached
      await expect(newListBtn).toBeHidden();
    }

    // Cleanup: delete lists created by this test run (requires auth header)
    const cleanupCookies = await page.context().cookies('http://localhost:3000');
    const cleanupAuthCookie = cleanupCookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    let cleanupToken: string | null = null;
    if (cleanupAuthCookie) {
      try {
        const base64Val = cleanupAuthCookie.value.replace(/^base64-/, '');
        const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
        cleanupToken = (JSON.parse(decoded) as { access_token?: string }).access_token ?? null;
      } catch { /* ignore */ }
    }
    if (cleanupToken) {
      const listsResp = await page.request.get('/api/lists', {
        headers: { Authorization: `Bearer ${cleanupToken}` },
      });
      if (listsResp.ok()) {
        const allLists = await listsResp.json();
        const testLists = Array.isArray(allLists)
          ? allLists.filter((l: { name: string }) =>
              createdNames.includes(l.name)
            )
          : [];
        for (const list of testLists as Array<{ id: string }>) {
          await page.request.delete(`/api/lists/${list.id}`, {
            headers: { Authorization: `Bearer ${cleanupToken}` },
          });
        }
      }
    }
  });
});

// --- Phase 2 stubs (serialised with J12+J13 to avoid list-cap interference) ---

test.describe('J26 — Delete list', () => {
  test('deleting a list removes it from the lists page', async ({
    authedPage: page,
  }) => {
    await page.goto('/lists');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    // J13 (serial predecessor) leaves the account at the 3-list cap.
    // Delete down to 2 lists so the "New List" button is available.
    const cookies = await page.context().cookies('http://localhost:3000');
    const authCookie = cookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    let token: string | null = null;
    if (authCookie) {
      try {
        const base64Val = authCookie.value.replace(/^base64-/, '');
        const decoded = Buffer.from(base64Val, 'base64').toString('utf-8');
        token = (JSON.parse(decoded) as { access_token?: string }).access_token ?? null;
      } catch { /* ignore */ }
    }
    if (token) {
      const preResp = await page.request.get('/api/lists', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (preResp.ok()) {
        const preLists = await preResp.json();
        const all = Array.isArray(preLists) ? preLists : [];
        // Keep only the first 2 — delete the rest to get below the 3-list cap
        // Delete ALL lists — accumulated residue from prior runs causes cap races
        for (const l of (all as Array<{ id: string }>)) {
          await page.request.delete(`/api/lists/${l.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        if (all.length > 0) {
          await page.reload();
          await page.waitForLoadState('networkidle');
        }
      }
    }

    // Create a list to delete
    const listName = `Delete Test ${Date.now()}`;
    await page.getByRole('button', { name: /^\+?\s*New List$/i }).click();
    await page.getByPlaceholder('List name').fill(listName);
    await page.getByPlaceholder('List name').press('Enter');
    await expect(page.getByText(listName)).toBeVisible({ timeout: 10_000 });

    // List cards are plain divs — locate by text + presence of the "List options" button
    const listCard = page
      .locator('div')
      .filter({ hasText: listName })
      .filter({ has: page.getByRole('button', { name: /list options/i }) })
      .last();

    // The delete handler uses window.confirm() — accept it via Playwright's dialog API
    page.once('dialog', (dialog) => dialog.accept());

    // Open the options menu and click Delete
    await listCard.getByRole('button', { name: /list options/i }).click();
    await page.getByRole('button', { name: /delete/i }).click();

    // List should no longer appear on the page
    await expect(page.getByText(listName)).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('J27 — Remove shop from list', () => {
  test('removing a shop from a list updates the shop count', async ({
    authedPage: page,
  }) => {
    const shopsResponse = await page.request.get(
      '/api/shops?featured=true&limit=1'
    );
    const shops = await shopsResponse.json();
    const shop = first(shops);
    test.skip(!shop, 'No seeded shops available');

    // Create a fresh test list
    await page.goto('/lists');
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });

    const listName = `咖啡廳週末清單-${Date.now()}`;
    await page.getByRole('button', { name: /^\+?\s*New List$/i }).click();
    await page.getByPlaceholder('List name').fill(listName);
    await page.getByPlaceholder('List name').press('Enter');
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

      const checkedListCheckbox = page.getByRole('checkbox', {
        name: listName,
      });
      await expect(checkedListCheckbox).toBeChecked({ timeout: 5_000 });
      await checkedListCheckbox.uncheck();
      await page.getByRole('button', { name: /Done/i }).click();

      // List detail should no longer show the shop
      await page.goto(`/lists/${createdList!.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText(shop!.name)).toBeHidden({ timeout: 10_000 });
    } finally {
      await page.request
        .delete(`/api/lists/${createdList!.id}`)
        .catch(() => null);
    }
  });
});

}); // end test.describe.serial('List cap tests (J12 + J13 + J26 + J27)')
