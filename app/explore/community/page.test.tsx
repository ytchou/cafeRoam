import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';

vi.mock('swr', () => ({
  default: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  }),
}));

vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ liked: false }),
  fetchPublic: vi.fn(),
}));

import swr from 'swr';

const swrMock = vi.mocked(swr);

import CommunityFeedPage from './page';

const MOCK_FEED = {
  notes: [
    makeCommunityNote({ checkinId: 'ci-1' }),
    makeCommunityNote({
      checkinId: 'ci-2',
      reviewText: 'Simple Kaffa is incredible.',
    }),
  ],
  nextCursor: '2026-03-14T10:00:00',
};

describe('Community Feed Page', () => {
  beforeEach(() => {
    swrMock.mockImplementation(((key: string) => {
      if (key?.includes('/api/explore/community')) {
        return {
          data: MOCK_FEED,
          isLoading: false,
          error: null,
          mutate: vi.fn(),
          isValidating: false,
        };
      }
      return {
        data: undefined,
        isLoading: false,
        error: null,
        mutate: vi.fn(),
        isValidating: false,
      };
    }) as typeof swr);
  });

  it('shows the page title From the Community', () => {
    render(<CommunityFeedPage />);
    expect(screen.getByText('From the Community')).toBeInTheDocument();
  });

  it('renders community note cards', () => {
    render(<CommunityFeedPage />);
    expect(
      screen.getByText(/most incredible natural light/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Simple Kaffa is incredible/)).toBeInTheDocument();
  });

  it('shows Load more notes button when next cursor exists', () => {
    render(<CommunityFeedPage />);
    expect(screen.getByText(/Load more notes/)).toBeInTheDocument();
  });
});
