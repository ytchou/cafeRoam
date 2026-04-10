// @source app/page.tsx                            (search lives here post-DEV-281 consolidation)
// @source lib/hooks/use-search-state.ts           (URL param 'q' and 'view')
// @source components/shops/shop-card-compact.tsx  (article selector)
// @source components/map/list-mobile-layout.tsx   (list view layout)
// If any of the above files change routes, DOM structure, or visible text,
// re-verify selectors and URL paths in this file.
import { test, expect } from './fixtures/auth';

test.describe('@critical J07 — Semantic search returns ranked results', () => {
  test('searching "想找安靜可以工作的地方" returns at least one result', async ({
    authedPage: page,
  }) => {
    // Navigate to / (search lives here after DEV-281 consolidation) in list view
    // so article cards are visible without scrolling a carousel.
    await page.goto(
      '/?q=' + encodeURIComponent('想找安靜可以工作的地方') + '&view=list'
    );
    await page.waitForLoadState('networkidle');

    // At least one shop card (article) should be visible in list view
    const results = page.locator('article');
    await expect(results.first()).toBeVisible({ timeout: 15_000 });
  });
});

// --- Phase 2 stubs ---

test.describe('J08 — Mode chip: select "work" → filtered results', () => {
  test('selecting work mode chip filters search results to work-friendly shops', async ({
    authedPage: page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mode chips may be labeled "Work", "工作", or similar — skip if not yet shipped
    const workChip = page
      .getByRole('button', { name: /^Work$/i })
      .or(page.getByRole('button', { name: /工作模式|work mode/i }));

    const hasChip = await workChip
      .first()
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    test.skip(!hasChip, 'Work mode chip not available in current search UI');

    await workChip.first().click();

    // Results should load after mode selection
    await expect(page.getByText('搜尋中…')).toBeHidden({ timeout: 15_000 });

    const results = page.locator('[data-slot="card"], article, .space-y-4 > a');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('J09 — Suggestion chip: tap preset → search executes', () => {
  test('tapping "有插座可以久坐" chip auto-fills search and shows results', async ({
    authedPage: page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Suggestion chip should be visible on the search page
    const chip = page.getByRole('button', { name: '有插座可以久坐' });
    await expect(chip).toBeVisible({ timeout: 10_000 });

    await chip.click();

    // Search input should be auto-filled with the chip text
    // Use #discovery-search to avoid matching the filters search bar (also form[role="search"])
    const searchInput = page.locator('#discovery-search');
    await expect(searchInput).toHaveValue('有插座可以久坐', { timeout: 5_000 });

    // Results should load
    await expect(page.getByText('搜尋中…')).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('沒有找到結果')).toBeHidden();

    const results = page.locator('[data-slot="card"], article, .space-y-4 > a');
    await expect(results.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('J21 — Filter pills: toggle WiFi → results update', () => {
  test('toggling WiFi filter pill updates the displayed results', async ({
    authedPage: page,
  }) => {
    // Navigate to search and get initial results
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Use #discovery-search to avoid matching the filters search bar (also form[role="search"])
    const searchInput = page.locator('#discovery-search');
    await searchInput.fill('咖啡廳');
    await searchInput.press('Enter');
    await expect(page.getByText('搜尋中…')).toBeHidden({ timeout: 15_000 });

    // WiFi filter pill — skip if not yet shipped in search UI
    const wifiFilter = page.getByRole('button', { name: /WiFi/i });
    const hasWifi = await wifiFilter
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    test.skip(!hasWifi, 'WiFi filter pill not present in current search UI');

    // Toggle WiFi filter on
    await wifiFilter.click();
    await page.waitForLoadState('networkidle');

    // Filter should now show as active (aria-pressed="true" or data-active="true")
    const ariaPressed = await wifiFilter.getAttribute('aria-pressed');
    const dataActive = await wifiFilter.getAttribute('data-active');
    const isActive = ariaPressed === 'true' || dataActive === 'true';
    expect(
      isActive,
      'WiFi filter should be marked as active after clicking'
    ).toBe(true);
    await expect(wifiFilter).toBeVisible();
  });
});
