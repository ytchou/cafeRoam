import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock @next/third-parties/google
vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="ga-script" data-ga-id={gaId} />
  ),
}));

// Capture gtag calls
const gtagCalls: unknown[][] = [];
const mockGtag = (...args: unknown[]) => {
  gtagCalls.push(args);
};

// After vi.resetModules(), both GA4Provider and ConsentProvider must be
// re-imported together so they share the same ConsentContext instance.
async function importModules() {
  const { GA4Provider } = await import('../ga4');
  const { ConsentProvider } = await import('@/lib/consent/provider');
  return { GA4Provider, ConsentProvider };
}

describe('GA4Provider', () => {
  beforeEach(() => {
    gtagCalls.length = 0;
    // Set up window.gtag mock
    Object.defineProperty(window, 'gtag', {
      value: mockGtag,
      writable: true,
      configurable: true,
    });
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', 'G-TEST12345');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.cookie = 'caferoam_consent=; max-age=0; path=/';
  });

  it('when GA is not configured, no tracking script is injected', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    vi.resetModules();
    const { GA4Provider, ConsentProvider } = await importModules();
    const { container } = render(
      <ConsentProvider>
        <GA4Provider />
      </ConsentProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('given a first-time visitor with no consent decision, GA4 loads in denied consent mode', async () => {
    vi.resetModules();
    const { GA4Provider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <GA4Provider />
      </ConsentProvider>
    );

    const defaultCall = gtagCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'default'
    );
    expect(defaultCall).toBeDefined();
    expect(defaultCall![2]).toEqual(
      expect.objectContaining({ analytics_storage: 'denied' })
    );
  });

  it('updates consent to granted when the visitor accepts cookies', async () => {
    document.cookie = 'caferoam_consent=granted; path=/';
    vi.resetModules();
    const { GA4Provider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <GA4Provider />
      </ConsentProvider>
    );

    const updateCall = gtagCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'update'
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![2]).toEqual(
      expect.objectContaining({ analytics_storage: 'granted' })
    );
  });

  it('does not fire consent update when consent is pending', async () => {
    vi.resetModules();
    const { GA4Provider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <GA4Provider />
      </ConsentProvider>
    );

    const updateCall = gtagCalls.find(
      (call) => call[0] === 'consent' && call[1] === 'update'
    );
    expect(updateCall).toBeUndefined();
  });
});
