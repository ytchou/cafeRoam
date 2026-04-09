import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import useSWR from 'swr';
import ExplorePage from './page';
import { makeCommunityNote } from '@/lib/test-utils/factories';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useDistricts } from '@/lib/hooks/use-districts';

vi.mock('@/lib/tarot/share-card', () => ({ shareCard: vi.fn() }));
vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(),
}));
vi.mock('@/lib/hooks/use-districts', () => ({
  useDistricts: vi.fn(),
}));

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
  );
  mockUseGeolocation.mockReturnValue({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    requestLocation: vi.fn(),
  });
  mockUseDistricts.mockReturnValue({
    districts: [],
    isLoading: false,
    error: null,
  });
});

describe('ExplorePage — GPS status feedback', () => {
  const DAAN_DISTRICT = {
    id: 'd1',
    slug: 'daan',
    nameZh: '大安',
    nameEn: 'Da-an',
    city: 'Taipei',
    shopCount: 25,
    sortOrder: 1,
    descriptionEn: null,
    descriptionZh: null,
  };

  it('shows "Finding your location" when GPS is loading', () => {
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: null,
      loading: true,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [DAAN_DISTRICT],
      isLoading: false,
      error: null,
    });
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText(/finding your location/i)).toBeInTheDocument();
  });

  it('shows "Within 3 km" when Near Me is active with GPS', () => {
    mockUseGeolocation.mockReturnValue({
      latitude: 25.033,
      longitude: 121.565,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [DAAN_DISTRICT],
      isLoading: false,
      error: null,
    });
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText(/within 3 km of you/i)).toBeInTheDocument();
  });

  it('shows location unavailable message when GPS is denied', () => {
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: 'User denied Geolocation',
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [DAAN_DISTRICT],
      isLoading: false,
      error: null,
    });
    setupSwrMock();
    render(<ExplorePage />);
    expect(screen.getByText(/location unavailable/i)).toBeInTheDocument();
  });
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

const mockUseGeolocation = vi.mocked(useGeolocation);
const mockUseDistricts = vi.mocked(useDistricts);

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

  it('shows the submit shop CTA', async () => {
    setupSwrMock();
    render(<ExplorePage />);
    expect(
      await screen.findByText(/知道一間很棒的咖啡廳/)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /推薦咖啡廳/i })).toHaveAttribute(
      'href',
      '/submit'
    );
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
    expect(screen.getByText('Quiet')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
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

describe('ExplorePage — district-mode empty state', () => {
  const DAAN_DISTRICT = {
    id: 'd1',
    slug: 'daan',
    nameZh: '大安',
    nameEn: 'Da-an',
    city: 'Taipei',
    shopCount: 25,
    sortOrder: 1,
    descriptionEn: null,
    descriptionZh: null,
  };

  function setupSwrWithEmptyTarot() {
    vi.mocked(useSWR).mockImplementation((key) => {
      if (typeof key === 'string' && key.includes('/api/explore/tarot-draw')) {
        return { data: [], error: null, isLoading: false } as ReturnType<
          typeof useSWR
        >;
      }
      if (key === '/api/explore/vibes') {
        return {
          data: MOCK_VIBES,
          error: null,
          isLoading: false,
        } as ReturnType<typeof useSWR>;
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

  it('shows "Try a different district" CTA and hides "Expand radius" when GPS is denied and district draw returns empty', () => {
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: 'User denied Geolocation',
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [DAAN_DISTRICT],
      isLoading: false,
      error: null,
    });
    setupSwrWithEmptyTarot();
    render(<ExplorePage />);
    expect(
      screen.getByRole('button', { name: /try a different district/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /expand radius/i })
    ).not.toBeInTheDocument();
  });

  it('tapping "Try a different district" invokes the handler without throwing', async () => {
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: 'User denied Geolocation',
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [DAAN_DISTRICT],
      isLoading: false,
      error: null,
    });
    setupSwrWithEmptyTarot();
    render(<ExplorePage />);
    const button = screen.getByRole('button', {
      name: /try a different district/i,
    });
    await userEvent.click(button);
    // Handler fired without errors — GPS-denied users always have a fallback district,
    // so the empty state remains visible after reset (expected behavior)
    expect(screen.getByText(/No cafes open nearby/i)).toBeInTheDocument();
  });
});

describe('ExplorePage with district picker', () => {
  it('shows district picker above daily draw section', () => {
    setupSwrMock();
    mockUseGeolocation.mockReturnValue({
      latitude: 25.033,
      longitude: 121.565,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [
        {
          id: 'd1',
          slug: 'daan',
          nameZh: '大安',
          nameEn: 'Da-an',
          city: 'Taipei',
          shopCount: 25,
          sortOrder: 1,
          descriptionEn: null,
          descriptionZh: null,
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<ExplorePage />);
    expect(
      screen.getByRole('group', { name: /location filter/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /near me/i })
    ).toBeInTheDocument();
  });

  it('defaults to first district when GPS is denied', () => {
    setupSwrMock();
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: 'User denied Geolocation',
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [
        {
          id: 'd1',
          slug: 'daan',
          nameZh: '大安',
          nameEn: 'Da-an',
          city: 'Taipei',
          shopCount: 25,
          sortOrder: 1,
          descriptionEn: null,
          descriptionZh: null,
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<ExplorePage />);
    expect(screen.getByRole('button', { name: /near me/i })).toBeDisabled();
    expect(screen.queryByText(/enable location/i)).not.toBeInTheDocument();
  });

  it('switches from Near Me to district when district pill is clicked', async () => {
    setupSwrMock();
    mockUseGeolocation.mockReturnValue({
      latitude: 25.033,
      longitude: 121.565,
      error: null,
      loading: false,
      requestLocation: vi.fn(),
    });
    mockUseDistricts.mockReturnValue({
      districts: [
        {
          id: 'd1',
          slug: 'daan',
          nameZh: '大安',
          nameEn: 'Da-an',
          city: 'Taipei',
          shopCount: 25,
          sortOrder: 1,
          descriptionEn: null,
          descriptionZh: null,
        },
      ],
      isLoading: false,
      error: null,
    });
    render(<ExplorePage />);
    await userEvent.click(screen.getByRole('button', { name: /大安/i }));
    const nearMeBtn = screen.getByRole('button', { name: /near me/i });
    expect(nearMeBtn).not.toHaveClass('bg-amber-700');
  });
});
