import { test as base, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { renameSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto'; // used for per-worker tmp file uniqueness
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, '..', '.auth');
const STORAGE_STATE_PATH = path.join(AUTH_DIR, 'user.json');

async function loginFresh(
  browser: import('@playwright/test').Browser,
  email: string,
  password: string
): Promise<import('@playwright/test').BrowserContext> {
  const ctx = await browser.newContext();

  const pg = await ctx.newPage();
  await pg.goto('/login');
  await pg.fill('#email', email);
  await pg.fill('#password', password);
  await pg.click('button[type="submit"]');
  await pg.waitForURL('/', { timeout: 15_000 });

  // Set the consent cookie via JavaScript so it's scoped to the correct origin
  // and captured by storageState(). This prevents the fixed-bottom cookie banner
  // (z-50) from intercepting pointer events in tests that reuse this stored session.
  await pg.evaluate(() => {
    document.cookie =
      'caferoam_consent=denied; max-age=31536000; path=/; SameSite=Lax';
  });

  // Write to a per-worker temp file then rename atomically. Using a random suffix
  // prevents multiple parallel workers from overwriting each other's .tmp file,
  // which would cause ENOENT on the rename when two workers race to write the same path.
  mkdirSync(AUTH_DIR, { recursive: true });
  const tmpPath = `${STORAGE_STATE_PATH}.${randomBytes(4).toString('hex')}.tmp`;
  await ctx.storageState({ path: tmpPath });
  renameSync(tmpPath, STORAGE_STATE_PATH);

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
        'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for authenticated tests'
      );
    }

    let context;
    try {
      context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
    } catch {
      context = await loginFresh(browser, email, password);
    }

    // Validate session is still active by probing a protected route.
    // NOTE: '/' is in PUBLIC_ROUTES and never redirects to /login, so it cannot
    // detect expired sessions. '/profile' requires auth and correctly redirects
    // expired sessions to /login.
    const probe = await context.newPage();
    await probe.goto('/profile', { waitUntil: 'commit' });
    const isExpired = probe.url().includes('/login');
    await probe.close();

    if (isExpired) {
      await context.close();
      context = await loginFresh(browser, email, password);
    }

    // Always inject the consent cookie into the context so the cookie banner
    // never appears during tests. We do this here (not just in loginFresh) because
    // cached sessions loaded from user.json may predate this cookie being set.
    await context.addCookies([
      {
        name: 'caferoam_consent',
        value: 'denied',
        url: 'http://localhost:3000',
        expires: Math.floor(Date.now() / 1000) + 31_536_000,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      },
    ]);

    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
