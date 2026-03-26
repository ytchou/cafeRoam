import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ConsentProvider } from '@/lib/consent/provider';

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

  it('renders nothing when GA measurement ID is not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', '');
    vi.resetModules();
    const { GA4Provider } = await import('../ga4');
    const { container } = render(
      <ConsentProvider>
        <GA4Provider />
      </ConsentProvider>
    );
    expect(container.innerHTML).toBe('');
  });

  it('sets consent default to denied on mount when no consent cookie exists', async () => {
    vi.resetModules();
    const { GA4Provider } = await import('../ga4');
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
    const { GA4Provider } = await import('../ga4');
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
    const { GA4Provider } = await import('../ga4');
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
