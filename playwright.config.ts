import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Playwright auto-loads .env but not .env.local — load it explicitly for local dev.
// In CI, these vars are injected directly into process.env so the file won't exist.
try {
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !(match[1].trim() in process.env)) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {
  // .env.local absent in CI — no-op
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // workers: 1 in CI to prevent shared auth state race conditions across tests
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    actionTimeout: 10_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
