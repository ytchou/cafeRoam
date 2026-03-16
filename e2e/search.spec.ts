import { test, expect } from './fixtures/auth';

test.describe('@critical J07 — Semantic search returns ranked results', () => {
  test('searching "想找安靜可以工作的地方" returns at least one result', async ({
    authedPage: page,
  }) => {
    await page.goto('/search');

    // Fill search input and submit
    const searchForm = page.locator('form[role="search"]');
    const searchInput = searchForm.getByRole('textbox');
    await searchInput.fill('想找安靜可以工作的地方');
    await searchForm.evaluate((form) =>
      form.dispatchEvent(new Event('submit', { bubbles: true })),
    );

    // Wait for results to load (not "搜尋中…" loading state)
    await expect(page.getByText('搜尋中…')).toBeHidden({ timeout: 15_000 });

    // Should show at least one result (not the "no results" message)
    await expect(page.getByText('沒有找到結果')).toBeHidden();

    // At least one shop card should be visible
    const results = page.locator('[data-slot="card"], article, .space-y-4 > a');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
  });
});

// --- Phase 2 stubs ---

test.describe('J08 — Mode chip: select "work" → filtered results', () => {
  test.fixme('selecting work mode chip filters search results to work-friendly shops', async () => {});
});

test.describe('J09 — Suggestion chip: tap preset → search executes', () => {
  test.fixme('tapping "有插座可以久坐" chip auto-fills search and shows results', async () => {});
});

test.describe('J21 — Filter pills: toggle WiFi → results update', () => {
  test.fixme('toggling WiFi filter pill updates the displayed results', async () => {});
});
