import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}));

describe('instrumentation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe('register()', () => {
    it('imports sentry.server.config when NEXT_RUNTIME is nodejs', async () => {
      vi.stubEnv('NEXT_RUNTIME', 'nodejs');
      const { register } = await import('../../instrumentation');
      await expect(register()).resolves.toBeUndefined();
    });

    it('imports sentry.edge.config when NEXT_RUNTIME is edge', async () => {
      vi.stubEnv('NEXT_RUNTIME', 'edge');
      const { register } = await import('../../instrumentation');
      await expect(register()).resolves.toBeUndefined();
    });

    it('does nothing when NEXT_RUNTIME is not set', async () => {
      vi.stubEnv('NEXT_RUNTIME', '');
      const { register } = await import('../../instrumentation');
      await expect(register()).resolves.toBeUndefined();
    });
  });

  describe('onRequestError()', () => {
    it('calls Sentry.captureRequestError with the provided args', async () => {
      const Sentry = await import('@sentry/nextjs');
      const { onRequestError } = await import('../../instrumentation');
      const fakeArgs = [
        { message: 'error' },
        { request: {} },
        { routeType: 'render' },
      ];

      await onRequestError(...fakeArgs);

      expect(Sentry.captureRequestError).toHaveBeenCalledWith(...fakeArgs);
    });
  });
});
