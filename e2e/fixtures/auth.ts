import { test as base, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'user.json');

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ browser }, use) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for authenticated tests',
      );
    }

    let context;
    try {
      // Try reusing existing session
      context = await browser.newContext({
        storageState: STORAGE_STATE_PATH,
      });
    } catch {
      // No stored session — login fresh
      context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/login');
      await page.fill('#email', email);
      await page.fill('#password', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/', { timeout: 15_000 });

      // Save session for reuse
      await context.storageState({ path: STORAGE_STATE_PATH });
      await page.close();

      // Re-create context with saved state
      await context.close();
      context = await browser.newContext({
        storageState: STORAGE_STATE_PATH,
      });
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
