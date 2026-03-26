import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsentProvider } from '@/lib/consent/provider';

// Mock posthog-js before importing the provider
const mockInit = vi.fn();
const mockOptOut = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    opt_out_capturing: mockOptOut,
  },
}));

function renderWithConsent(children: React.ReactNode) {
  return render(<ConsentProvider>{children}</ConsentProvider>);
}

describe('PostHogProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    mockInit.mockReset();
    mockOptOut.mockReset();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
    document.cookie = 'caferoam_consent=; max-age=0; path=/';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders children when PostHog key is not set', async () => {
    const { PostHogProvider } = await import('../provider');
    renderWithConsent(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('does not initialize PostHog when consent is pending', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    const { PostHogProvider } = await import('../provider');
    renderWithConsent(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    // Wait a tick for the useEffect
    await new Promise((r) => setTimeout(r, 50));
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('initializes PostHog when consent is granted', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com');
    document.cookie = 'caferoam_consent=granted; path=/';

    const { PostHogProvider } = await import('../provider');
    renderWithConsent(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    // Wait for dynamic import + init
    await new Promise((r) => setTimeout(r, 100));
    expect(mockInit).toHaveBeenCalledWith('phc_test123', expect.objectContaining({
      api_host: 'https://app.posthog.com',
      capture_pageview: true,
    }));
  });

  it('does not initialize PostHog when consent is denied', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    document.cookie = 'caferoam_consent=denied; path=/';

    const { PostHogProvider } = await import('../provider');
    renderWithConsent(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockInit).not.toHaveBeenCalled();
  });
});
