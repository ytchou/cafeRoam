import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

describe('Sentry client configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('calls Sentry.init with correct config when DSN is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    const Sentry = await import('@sentry/nextjs');
    await import('../../sentry.client.config');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://test@sentry.io/123',
        tracesSampleRate: 0.1,
        enabled: true,
      }),
    );
  });

  it('disables Sentry when DSN is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    const Sentry = await import('@sentry/nextjs');
    await import('../../sentry.client.config');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
