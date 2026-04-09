import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';
import { makeStamp } from '@/lib/test-utils/factories';
import { useSearchParams } from 'next/navigation';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-token',
            user: { email: 'mei.ling@gmail.com' },
          },
        },
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: 'mei.ling@gmail.com' } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => '/profile'),
  useSearchParams: vi.fn(() => null),
}));

vi.mock('@/components/profile/profile-tabs', () => ({
  ProfileTabs: ({ defaultTab }: { defaultTab: string }) => (
    <div data-testid="profile-tabs" data-default-tab={defaultTab} />
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import ProfilePage from './page';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map() } },
    children
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function mockAllEndpoints(
    overrides: {
      profile?: Record<string, unknown>;
      stamps?: unknown[];
      checkins?: unknown[];
    } = {}
  ) {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            overrides.profile ?? {
              display_name: 'Mei-Ling',
              avatar_url: null,
              checkin_count: 1,
              stamp_count: 3,
            },
        });
      }
      if (url.includes('/api/stamps')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            overrides.stamps ?? [
              { ...makeStamp({ id: 'stamp-1' }), shop_name: 'Fika Coffee' },
            ],
        });
      }
      if (url.includes('/api/checkins')) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            overrides.checkins ?? [
              {
                id: 'ci-1',
                user_id: 'user-1',
                shop_id: 'shop-a',
                shop_name: 'Fika Coffee',
                shop_mrt: 'Daan',
                shop_photo_url: 'https://example.com/shops/fika/exterior.jpg',
                photo_urls: ['https://example.com/p.jpg'],
                stars: 4,
                review_text: null,
                created_at: '2026-03-01T00:00:00Z',
              },
            ],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  }

  it('renders profile header with display name and check-in count', async () => {
    mockAllEndpoints();
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Mei-Ling')).toBeInTheDocument();
    });
    expect(screen.getByText('Check-ins')).toBeInTheDocument();
  });

  it('fires profile_stamps_viewed event with stamp count when stamps load', async () => {
    mockAllEndpoints({
      stamps: [
        { ...makeStamp({ id: 'stamp-1' }), shop_name: '山小孩咖啡' },
        { ...makeStamp({ id: 'stamp-2' }), shop_name: 'Fika Coffee' },
      ],
    });
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      const analyticsCall = mockFetch.mock.calls.find(
        (c) => c[0] === '/api/analytics/events'
      );
      expect(analyticsCall).toBeDefined();
      const body = JSON.parse(analyticsCall![1].body);
      expect(body.event).toBe('profile_stamps_viewed');
      expect(body.properties).toEqual({ stamp_count: 2 });
    });
  });

  it('shows empty memories state when user has no stamps', async () => {
    mockAllEndpoints({ stamps: [] });
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      const analyticsCall = mockFetch.mock.calls.find(
        (c) => c[0] === '/api/analytics/events'
      );
      expect(analyticsCall).toBeDefined();
      const body = JSON.parse(analyticsCall![1].body);
      expect(body.event).toBe('profile_stamps_viewed');
      expect(body.properties).toEqual({ stamp_count: 0 });
    });
    expect(screen.getByTestId('profile-tabs')).toBeInTheDocument();
  });

  it('renders email from auth session in profile header', async () => {
    mockAllEndpoints();
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('mei.ling@gmail.com')).toBeInTheDocument();
    });
  });

  it('renders memories count stat from stamp_count', async () => {
    mockAllEndpoints({
      profile: {
        display_name: 'Mei',
        avatar_url: null,
        checkin_count: 5,
        stamp_count: 12,
      },
    });
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument();
    });
    expect(screen.getByText('Memories')).toBeInTheDocument();
  });
});

describe('ProfilePage tab routing', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    // Reset useSearchParams mock before each test
    vi.mocked(useSearchParams).mockReturnValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function mockAllEndpointsForTabTests() {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/profile')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            display_name: 'Mei-Ling',
            avatar_url: null,
            checkin_count: 1,
            stamp_count: 3,
          }),
        });
      }
      if (url.includes('/api/stamps')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { ...makeStamp({ id: 'stamp-1' }), shop_name: 'Fika Coffee' },
          ],
        });
      }
      if (url.includes('/api/checkins')) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  }

  it('passes defaultTab="stamps" when no ?tab param is present', async () => {
    vi.mocked(useSearchParams).mockReturnValue(null);
    mockAllEndpointsForTabTests();
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      const tabs = screen.getByTestId('profile-tabs');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('data-default-tab', 'stamps');
    });
  });

  it('passes defaultTab="lists" when ?tab=lists is in the URL', async () => {
    const mockParams = new URLSearchParams('tab=lists');
    vi.mocked(useSearchParams).mockReturnValue(
      mockParams as unknown as ReturnType<typeof useSearchParams>
    );
    mockAllEndpointsForTabTests();
    render(<ProfilePage />, { wrapper });

    await waitFor(() => {
      const tabs = screen.getByTestId('profile-tabs');
      expect(tabs).toBeInTheDocument();
      expect(tabs).toHaveAttribute('data-default-tab', 'lists');
    });
  });
});
