import { test as base, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_STATE_PATH = path.join(__dirname, '..', '.auth', 'user.json');

async function loginFresh(
  browser: import('@playwright/test').Browser,
  email: string,
  password: string,
): Promise<import('@playwright/test').BrowserContext> {
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  await pg.goto('/login');
  await pg.fill('#email', email);
  await pg.fill('#password', password);
  await pg.click('button[type="submit"]');
  await pg.waitForURL('/', { timeout: 15_000 });
  await ctx.storageState({ path: STORAGE_STATE_PATH });
  await pg.close();
  await ctx.close();
  return browser.newContext({ storageState: STORAGE_STATE_PATH });
}

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
      context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    } catch {
      context = await loginFresh(browser, email, password);
    }

    // Validate session is still active (stored token may have expired)
    const probe = await context.newPage();
    await probe.goto('/', { waitUntil: 'commit' });
    const isExpired = probe.url().includes('/login');
    await probe.close();

    if (isExpired) {
      await context.close();
      context = await loginFresh(browser, email, password);
    }

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
