import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useDistricts } from '@/lib/hooks/use-districts';
import VibePage from './page';

const mockUseGeolocation = vi.fn();

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ slug: 'study-cave' }),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: (...args: unknown[]) => mockUseGeolocation(...args),
}));
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));
vi.mock('@/lib/hooks/use-vibes', () => ({
  useVibes: vi.fn(() => ({ vibes: [] })),
}));
vi.mock('@/lib/hooks/use-districts', () => ({
  useDistricts: vi.fn(() => ({ districts: [], isLoading: false, error: null })),
}));
vi.mock('@/components/map/map-view', () => ({
  MapView: ({ selectedShopId }: { selectedShopId: string | null }) => (
    <div data-testid="mock-map-view" data-selected-shop-id={selectedShopId ?? ''} />
  ),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

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
  mockUseGeolocation.mockReturnValue({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    requestLocation: vi.fn(),
  });
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
    expect(screen.getByText('此區域尚無符合的咖啡廳')).toBeInTheDocument();
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

  it('When geolocation is denied, the 附近 filter reverts to 全部 and an error is shown', async () => {
    const user = userEvent.setup();
    const mockRequestLocation = vi.fn().mockResolvedValue(null);
    mockUseGeolocation.mockReturnValue({
      latitude: null,
      longitude: null,
      error: 'denied',
      loading: false,
      requestLocation: mockRequestLocation,
    });

    mockVibeShopsLoaded();
    render(<VibePage />);
    await user.click(screen.getByRole('button', { name: /附近/ }));

    expect(screen.getByRole('button', { name: '全部' })).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(toast.error).toHaveBeenCalledWith('無法取得位置，已切換回全部');
  });

  it('When no shops match the active filter, an empty state message is shown in Chinese', () => {
    mockVibeShopsEmpty();
    render(<VibePage />);
    expect(screen.getByText(/此區域尚無符合的咖啡廳/)).toBeInTheDocument();
  });

  it('When districts are available, their names appear as filter chips alongside 全部 and 附近', () => {
    vi.mocked(useDistricts).mockReturnValue({
      districts: [
        { id: 'district-daan', nameZh: '大安區' },
        { id: 'district-zhongzheng', nameZh: '中正區' },
      ],
      isLoading: false,
      error: null,
    });
    mockVibeShopsLoaded();
    render(<VibePage />);
    expect(screen.getByRole('button', { name: '大安區' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '中正區' })).toBeInTheDocument();
  });

  it('When a user clicks a shop card, that shop becomes the selected pin on the map', async () => {
    const user = userEvent.setup();
    mockVibeShopsLoaded();
    render(<VibePage />);
    const shopCard = screen.getByText('森日咖啡').closest('li');
    expect(shopCard).toBeTruthy();
    await user.click(shopCard!);
    const mapView = screen.getByTestId('mock-map-view');
    expect(mapView).toHaveAttribute('data-selected-shop-id', 'shop-a');
  });
});
