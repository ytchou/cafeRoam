import { test, expect } from '@playwright/test';

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

test.describe('J32 — Community feed: authenticated user likes a check-in', () => {
  test.fixme('tapping the like button on a community card increments the like count optimistically', async () => {});
});

test.describe('J33 — Community feed: MRT filter scopes results', () => {
  test.fixme('selecting a MRT station from the dropdown shows only check-ins near that station', async () => {});
});
