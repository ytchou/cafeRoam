import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const REALISTIC_DSN =
  'https://a1b2c3d4e5f678901234567890abcdef@o123456.ingest.sentry.io/1234567';

describe('Sentry environment configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('client config', () => {
    it('tags error reports with the configured environment label when override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'staging');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.client.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('staging');
    });

    it('falls back to NODE_ENV environment label when no override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', '');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.client.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('production');
    });
  });

  describe('server config', () => {
    it('tags error reports with the configured environment label when override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'staging');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.server.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('staging');
    });

    it('falls back to NODE_ENV environment label when no override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', '');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.server.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('production');
    });
  });

  describe('edge config', () => {
    it('tags error reports with the configured environment label when override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'staging');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.edge.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('staging');
    });

    it('falls back to NODE_ENV environment label when no override is set', async () => {
      const mockInit = vi.fn();
      vi.doMock('@sentry/nextjs', () => ({ init: mockInit }));

      vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', REALISTIC_DSN);
      vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', '');
      vi.stubEnv('NODE_ENV', 'production');

      await import('../../sentry.edge.config');

      expect(mockInit).toHaveBeenCalledOnce();
      expect(mockInit.mock.calls[0][0].environment).toBe('production');
    });
  });
});
