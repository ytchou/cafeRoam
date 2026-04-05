import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import useSWR from 'swr';
import VibePage from './page';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ slug: 'study-cave' }),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    requestLocation: vi.fn(),
  }),
}));
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));
vi.mock('@/lib/hooks/use-vibes', () => ({
  useVibes: vi.fn(() => ({ vibes: [] })),
}));
vi.mock('@/components/map/map-view', () => ({
  MapView: () => <div data-testid="mock-map-view" />,
}));

const MOCK_VIBE = {
  slug: 'study-cave',
  name: 'Study Cave',
  nameZh: '讀書洞穴',
  emoji: '📚',
  subtitle: 'Quiet · WiFi',
  tagIds: ['quiet', 'wifi'],
  sortOrder: 1,
};

const MOCK_SHOP = {
  shopId: 'shop-a',
  name: '森日咖啡',
  slug: 'sen-ri',
  rating: 4.5,
  reviewCount: 120,
  overlapScore: 0.75,
  distanceKm: null,
  coverPhotoUrl: null,
  matchedTagLabels: ['quiet', 'wifi'],
  latitude: 25.033,
  longitude: 121.565,
};

const MOCK_RESPONSE = {
  vibe: MOCK_VIBE,
  shops: [MOCK_SHOP],
  totalCount: 1,
};

function mockVibeShopsLoaded() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: MOCK_RESPONSE,
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsLoading() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: undefined,
        isLoading: true,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsEmpty() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: { vibe: MOCK_VIBE, shops: [], totalCount: 0 },
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

function mockVibeShopsWithDistance() {
  vi.mocked(useSWR).mockImplementation(
    () =>
      ({
        data: {
          vibe: MOCK_VIBE,
          shops: [{ ...MOCK_SHOP, distanceKm: 1.2 }],
          totalCount: 1,
        },
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useSWR>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VibePage — /explore/vibes/[slug]', () => {
  it('When a user opens a vibe page, they see the vibe name as the heading', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('Study Cave')).toBeInTheDocument();
  });

  it('When a user opens a vibe page, a back button is present to return to the previous page', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByLabelText('Go back')).toBeInTheDocument();
  });

  it('When a vibe has a subtitle, the chips are shown below the heading', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('Quiet')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('When all shops are shown without a filter, the count badge shows the total without a nearby qualifier', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText(/1 shop/i)).toBeInTheDocument();
    expect(screen.queryByText(/nearby/i)).not.toBeInTheDocument();
  });

  it('When a shop matches the vibe, its name and star rating appear in the list', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByText('森日咖啡')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('While shops are loading, skeleton placeholders are shown', () => {
    mockVibeShopsLoading();
    render(<VibePage />);
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('When no shops match the vibe, an empty state message is shown', () => {
    mockVibeShopsEmpty();
    render(<VibePage />);
    expect(
      screen.getByText('No shops found for this vibe.')
    ).toBeInTheDocument();
  });

  it('When a shop has a known distance, the distance badge is shown in the row', () => {
    mockVibeShopsWithDistance();
    render(<VibePage />);
    expect(screen.getByText('1.2 km')).toBeInTheDocument();
  });

  it('When a user opens a vibe page, the collapsible map panel is rendered showing all shop pins', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toHaveAttribute('data-collapsed', 'false');
  });

  it('When a user opens a vibe page, district filter chips are rendered with a 全部 option', () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
  });

  it('When a user opens a vibe page, all shops load immediately without waiting for geolocation', async () => {
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(await screen.findByText('森日咖啡')).toBeInTheDocument();
  });
});
