import { render, screen } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import useSWR from 'swr';
import ExplorePage from './page';
import { makeCommunityNote } from '@/lib/test-utils/factories';
import { useIsDesktop } from '@/lib/hooks/use-media-query';

vi.mock('@/lib/tarot/share-card', () => ({ shareCard: vi.fn() }));
vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
}));

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
  );
});

const MOCK_COMMUNITY = [
  makeCommunityNote(),
  makeCommunityNote({ checkinId: 'ci-2' }),
];

const MOCK_VIBES = [
  {
    slug: 'study-cave',
    name: 'Study Cave',
    nameZh: '讀書洞穴',
    emoji: '📚',
    subtitle: 'Quiet · WiFi',
    tagIds: ['quiet', 'wifi'],
    sortOrder: 1,
  },
  {
    slug: 'first-date',
    name: 'First Date',
    nameZh: '約會聖地',
    emoji: '💕',
    subtitle: 'Cozy · Pretty',
    tagIds: ['cozy', 'pretty'],
    sortOrder: 2,
  },
];

function setupSwrMock() {
  vi.mocked(useSWR).mockImplementation((key) => {
    if (key === '/api/explore/vibes') {
      return { data: MOCK_VIBES, error: null, isLoading: false } as ReturnType<
        typeof useSWR
      >;
    }
    if (key === '/api/explore/community/preview') {
      return {
        data: MOCK_COMMUNITY,
        error: null,
        isLoading: false,
      } as ReturnType<typeof useSWR>;
    }
    return { data: undefined, error: null, isLoading: false } as ReturnType<
      typeof useSWR
    >;
  });
}

describe('Explore page', () => {
  it('When a user opens the Explore tab, they see the 探索 page title', () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
  });

  it('When a user opens the Explore tab, they see a daily draw prompt with a Refresh option', () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText(/Your Daily Draw/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument();
  });

  it('When a user is on desktop, the community section renders in the right column', () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText('From the Community')).toBeInTheDocument();
    expect(screen.getByText('探索')).toBeInTheDocument();
    vi.mocked(useIsDesktop).mockReturnValue(false);
  });
});

describe('ExplorePage — vibe strip', () => {
  it('When a user opens Explore, they see the Browse by Vibe section', () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText('Browse by Vibe')).toBeInTheDocument();
  });

  it('When a user views the vibe strip, each vibe card shows its name and subtitle', () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText('Study Cave')).toBeInTheDocument();
    expect(screen.getByText('Quiet · WiFi')).toBeInTheDocument();
    expect(screen.getByText('First Date')).toBeInTheDocument();
  });

  it('When a user taps See all in the vibe section, they navigate to /explore/vibes', () => {
    setupSwrMock();
    render(<ExplorePage />);
    const vibeSection = screen.getByText('Browse by Vibe').closest('section');
    const seeAllLink = vibeSection?.querySelector('a[href="/explore/vibes"]');
    expect(seeAllLink).toBeInTheDocument();
    expect(seeAllLink).toHaveTextContent(/See all/);
  });
});

describe('Community Notes section', () => {
  it('shows From the Community heading when notes exist', () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText('From the Community')).toBeInTheDocument();
  });

  it('shows See all link that navigates to /explore/community', () => {
    setupSwrMock();
    render(<ExplorePage />);
    const communitySection = screen
      .getByText('From the Community')
      .closest('section');
    const link = communitySection?.querySelector(
      'a[href="/explore/community"]'
    );
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent(/See all/);
  });
});
