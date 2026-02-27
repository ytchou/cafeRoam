import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock posthog-js before importing the provider
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

describe('PostHogProvider', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset env
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
  });

  it('renders children when PostHog key is not set', async () => {
    const { PostHogProvider } = await import('../provider');
    render(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders children when PostHog key is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test123');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://app.posthog.com');

    const { PostHogProvider } = await import('../provider');
    render(
      <PostHogProvider>
        <div data-testid="child">Hello</div>
      </PostHogProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});
