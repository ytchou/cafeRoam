import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock posthog-js before importing the provider
const mockInit = vi.fn();
const mockOptOut = vi.fn();
const mockRegister = vi.fn();
const mockOptIn = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    opt_out_capturing: mockOptOut,
    opt_in_capturing: mockOptIn,
    register: mockRegister,
  },
}));

// After vi.resetModules(), both PostHogProvider and ConsentProvider must be
// re-imported together so they share the same ConsentContext instance.
async function importModules() {
  const { PostHogProvider } = await import('../provider');
  const { ConsentProvider } = await import('@/lib/consent/provider');
  return { PostHogProvider, ConsentProvider };
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
    const { PostHogProvider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </ConsentProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('when consent is pending, PostHog is not initialized', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    const { PostHogProvider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </ConsentProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('when a visitor grants consent, PostHog is initialized with the API key', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com');
    document.cookie = 'caferoam_consent=granted; path=/';

    const { PostHogProvider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </ConsentProvider>
    );
    await waitFor(() =>
      expect(mockInit).toHaveBeenCalledWith(
        'phc_test123',
        expect.objectContaining({
          api_host: 'https://app.posthog.com',
          capture_pageview: true,
        })
      )
    );
  });

  it('when consent is denied, PostHog is not initialized', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    document.cookie = 'caferoam_consent=denied; path=/';

    const { PostHogProvider, ConsentProvider } = await importModules();
    render(
      <ConsentProvider>
        <PostHogProvider>
          <div data-testid="child">Hello</div>
        </PostHogProvider>
      </ConsentProvider>
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('when a visitor revokes consent, analytics capture stops', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com');
    document.cookie = 'caferoam_consent=granted; path=/';

    const { PostHogProvider, ConsentProvider } = await importModules();
    const { useConsent } = await import('@/lib/consent/use-consent');

    function RevokeButton() {
      const { updateConsent } = useConsent();
      return (
        <button data-testid="revoke" onClick={() => updateConsent('denied')}>
          Revoke
        </button>
      );
    }

    render(
      <ConsentProvider>
        <PostHogProvider>
          <RevokeButton />
        </PostHogProvider>
      </ConsentProvider>
    );

    await waitFor(() => expect(mockInit).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('revoke'));
    await waitFor(() => expect(mockOptOut).toHaveBeenCalled());
  });
});
