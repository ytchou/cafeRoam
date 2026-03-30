import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Sentry environment configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses NEXT_PUBLIC_SENTRY_ENVIRONMENT when set', async () => {
    const mockInit = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'staging');
    vi.stubEnv('NODE_ENV', 'production');

    await import('../../sentry.client.config');

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit.mock.calls[0][0].environment).toBe('staging');
  });

  it('falls back to NODE_ENV when NEXT_PUBLIC_SENTRY_ENVIRONMENT is not set', async () => {
    const mockInit = vi.fn();
    vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://test@sentry.io/123');
    delete process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
    vi.stubEnv('NODE_ENV', 'production');

    await import('../../sentry.client.config');

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit.mock.calls[0][0].environment).toBe('production');
  });
});
