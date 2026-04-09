import { test as base, type Page, type TestInfo } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { renameSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, '..', '.auth');

// Per-project storage state — mobile and desktop use separate test accounts to
// avoid concurrent list/name mutations racing on the same Supabase user.
function storageStatePath(testInfo: TestInfo): string {
  const project = testInfo.project.name === 'desktop' ? 'desktop' : 'mobile';
  return path.join(AUTH_DIR, `user-${project}.json`);
}

function credentials(testInfo: TestInfo): { email: string; password: string } {
  if (testInfo.project.name === 'desktop') {
    const email =
      process.env.E2E_DESKTOP_USER_EMAIL ?? process.env.E2E_USER_EMAIL;
    const password =
      process.env.E2E_DESKTOP_USER_PASSWORD ?? process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      throw new Error(
        'E2E_DESKTOP_USER_EMAIL / E2E_DESKTOP_USER_PASSWORD (or fallback E2E_USER_EMAIL) must be set'
      );
    }
    return { email, password };
  }
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set for authenticated tests'
    );
  }
  return { email, password };
}

async function loginFresh(
  browser: import('@playwright/test').Browser,
  email: string,
  password: string,
  storagePath: string
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
  const tmpPath = `${storagePath}.${randomBytes(4).toString('hex')}.tmp`;
  await ctx.storageState({ path: tmpPath });
  renameSync(tmpPath, storagePath);

  await pg.close();
  await ctx.close();
  return browser.newContext({ storageState: storagePath });
}

async function createAuthContext(
  browser: import('@playwright/test').Browser,
  email: string,
  password: string,
  storagePath: string
): Promise<import('@playwright/test').BrowserContext> {
  let context;
  try {
    context = await browser.newContext({ storageState: storagePath });
  } catch {
    context = await loginFresh(browser, email, password, storagePath);
  }

  // Validate session is still active by probing a protected route.
  // '/profile' requires auth and correctly redirects expired sessions to /login.
  const probe = await context.newPage();
  await probe.goto('/profile', { waitUntil: 'commit' });
  const isExpired = probe.url().includes('/login');
  await probe.close();

  if (isExpired) {
    await context.close();
    context = await loginFresh(browser, email, password, storagePath);
  }

  // Inject the consent cookie so the cookie banner never appears during tests.
  await context.addCookies([
    {
      name: 'caferoam_consent',
      value: 'denied',
      url: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
      expires: Math.floor(Date.now() / 1000) + 31_536_000,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  return context;
}

export const test = base.extend<{ authedPage: Page; deletionPage: Page }>({
  authedPage: async ({ browser }, use, testInfo) => {
    const { email, password } = credentials(testInfo);
    const storagePath = storageStatePath(testInfo);
    const context = await createAuthContext(
      browser,
      email,
      password,
      storagePath
    );

    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  deletionPage: async ({ browser }, use) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for deletion tests'
      );
    }

    const suffix = randomBytes(4).toString('hex');
    const email = `e2e-deletion-${suffix}@caferoam.test`;
    const password = `TestPass!${suffix}`;
    let userId: string | null = null;

    // Create a temporary user via Supabase Admin API
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        app_metadata: { pdpa_consented: true },
      }),
    });
    if (!createRes.ok) {
      throw new Error(
        `Failed to create deletion test user: ${createRes.status} ${await createRes.text()}`
      );
    }
    const userData = (await createRes.json()) as { id: string };
    userId = userData.id;

    // Create a profile row (required for the app to function)
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        id: userId,
        display_name: `E2E Deletion ${suffix}`,
        pdpa_consent_at: new Date().toISOString(),
      }),
    });

    const storagePath = path.join(AUTH_DIR, `user-deletion-${suffix}.json`);
    const context = await createAuthContext(
      browser,
      email,
      password,
      storagePath
    );

    const page = await context.newPage();
    await use(page);
    await context.close();

    // Cleanup: delete the temp user via Admin API
    if (userId) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }).catch(() => null);
    }
    // Remove the temp storage state file
    const { unlinkSync } = await import('node:fs');
    try {
      unlinkSync(storagePath);
    } catch {
      // File may not exist if login failed
    }
  },
});

export { expect } from '@playwright/test';
