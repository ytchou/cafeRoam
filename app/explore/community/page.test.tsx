import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));

import swr from 'swr';
import { useIsDesktop } from '@/lib/hooks/use-media-query';

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

  it('renders 啡遊筆記 title on desktop', () => {
    (useIsDesktop as ReturnType<typeof vi.fn>).mockReturnValue(true);
    render(<CommunityFeedPage />);
    expect(screen.getByText('啡遊筆記')).toBeInTheDocument();
    (useIsDesktop as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it('shows MRT station filter dropdown', () => {
    render(<CommunityFeedPage />);
    expect(
      screen.getByRole('combobox', { name: /mrt station/i })
    ).toBeInTheDocument();
  });

  it('shows vibe tag filter chips', () => {
    render(<CommunityFeedPage />);
    expect(screen.getByRole('button', { name: /quiet/i })).toBeInTheDocument();
  });

  it('shows clear filters button when MRT filter is active', async () => {
    render(<CommunityFeedPage />);
    const select = screen.getByRole('combobox', { name: /mrt station/i });
    await userEvent.selectOptions(select, '中山');
    expect(
      screen.getByRole('button', { name: /clear filters/i })
    ).toBeInTheDocument();
  });

  it('resets filters when clear filters is clicked', async () => {
    render(<CommunityFeedPage />);
    const select = screen.getByRole('combobox', { name: /mrt station/i });
    await userEvent.selectOptions(select, '中山');
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    await userEvent.click(clearBtn);
    expect(select).toHaveValue('');
  });
});
