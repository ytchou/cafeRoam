import { test, expect } from './fixtures/auth';

test.describe('@critical J16 — Community feed: public access', () => {
  test('unauthenticated user can view the public community feed', async ({
    page,
  }) => {
    await page.goto('/explore/community');
    await page.waitForLoadState('networkidle');

    // Should not redirect to login — feed is public
    expect(page.url()).toContain('/explore/community');

    // Page heading should be visible
    await expect(
      page.getByRole('heading', { name: /From the Community|啡遊筆記/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('community feed renders MRT filter and vibe tag pills', async ({
    page,
  }) => {
    await page.goto('/explore/community');

    // MRT station select should be present
    await expect(
      page.getByRole('combobox', { name: /MRT station/i })
    ).toBeVisible({ timeout: 10_000 });

    // At least one vibe tag pill should be visible
    await expect(
      page
        .getByRole('button', {
          name: /Quiet|Laptop friendly|Good coffee|Instagrammable/i,
        })
        .first()
    ).toBeVisible();
  });
});

// --- Phase 2 stubs ---

test.describe('@critical J32 — Community feed: like toggle increments count', () => {
  test('tapping the like button on a community card increments the like count optimistically', async ({
    authedPage: page,
  }) => {
    await page.goto('/explore/community');
    await page.waitForLoadState('networkidle');

    // Find the first like button (LikeButton has aria-label containing "this note")
    const likeButton = page.locator('button[aria-pressed]').first();
    await expect(likeButton).toBeVisible({ timeout: 10_000 });
    test.skip(!(await likeButton.isVisible()), 'No community notes in feed');

    // Read current count from the <span> sibling inside the button
    const countSpan = likeButton.locator('span').first();
    const beforeText = await countSpan.textContent();
    const beforeCount = parseInt(beforeText ?? '0', 10);
    const wasLiked = (await likeButton.getAttribute('aria-pressed')) === 'true';

    // Tap the like button
    await likeButton.click();

    // Assert state toggled
    const expectedPressed = wasLiked ? 'false' : 'true';
    await expect(likeButton).toHaveAttribute('aria-pressed', expectedPressed);

    // Assert count changed by 1
    const expectedCount = wasLiked ? beforeCount - 1 : beforeCount + 1;
    await expect(countSpan).toHaveText(String(expectedCount), { timeout: 5_000 });
  });
});

test.describe('@critical J33 — Community feed: MRT filter scopes results', () => {
  test('selecting a MRT station from the dropdown shows only check-ins near that station', async ({
    page,
  }) => {
    await page.goto('/explore/community');
    await page.waitForLoadState('networkidle');

    // MRT station dropdown should be visible
    const mrtSelect = page.getByRole('combobox', { name: /MRT station/i });
    await expect(mrtSelect).toBeVisible({ timeout: 10_000 });

    // Get all options (skip "All stations" default)
    const options = mrtSelect.locator('option');
    const optionCount = await options.count();
    test.skip(optionCount <= 1, 'No MRT station options available beyond "All stations"');

    // Count cards before filtering
    const feedCards = page.locator('div.overflow-hidden.rounded-2xl.border');
    const beforeCount = await feedCards.count();

    // Select the second option (first real MRT station)
    const stationValue = await options.nth(1).getAttribute('value');
    await mrtSelect.selectOption(stationValue!);

    // Wait for feed to reload (URL or network)
    await page.waitForLoadState('networkidle');

    // Assert: either card count changed OR empty state appeared
    const afterCount = await feedCards.count();
    const emptyState = page.getByText('Community notes coming soon');
    const hasChanged = afterCount !== beforeCount;
    const isEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasChanged || isEmpty).toBeTruthy();
  });
});
