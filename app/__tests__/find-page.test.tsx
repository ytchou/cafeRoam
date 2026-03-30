import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { _resetDeviceCapabilityCache } from '@/lib/hooks/use-device-capability';

// Mock dynamic imports (MapView is dynamically imported with ssr: false)
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMap = (props: Record<string, unknown>) => (
      <div
        data-testid="map-view"
        data-selected={props.selectedShopId as string}
      >
        {(props.shops as Array<{ id: string }>)?.map((s) => (
          <button
            key={s.id}
            onClick={() => (props.onPinClick as (id: string) => void)?.(s.id)}
          >
            pin-{s.id}
          </button>
        ))}
      </div>
    );
    MockMap.displayName = 'MockMapView';
    return MockMap;
  },
}));

const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/lib/hooks/use-shops', () => ({
  useShops: () => ({
    shops: [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: '自由時光咖啡 Liberty Hour',
        slug: 'liberty-hour',
        latitude: 25.03,
        longitude: 121.56,
        rating: 4.5,
        address: '123 Coffee St',
        reviewCount: 10,
        photoUrls: ['https://example.com/photo.jpg'],
        taxonomyTags: [],
        isOpen: false,
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
        menuUrl: null,
        mrt: null,
      },
      {
        id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        name: 'WiFi Cafe',
        slug: 'wifi-cafe',
        latitude: 25.04,
        longitude: 121.57,
        rating: 4.5,
        address: '1 Coffee St',
        reviewCount: 10,
        photoUrls: [],
        taxonomyTags: [{ id: 'wifi_available', label: 'WiFi', labelZh: '有WiFi', dimension: 'functionality' }],
        isOpen: true,
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
        menuUrl: null,
        mrt: null,
      },
      {
        id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        name: 'Quiet Place',
        slug: 'quiet-place',
        latitude: 25.05,
        longitude: 121.58,
        rating: 4.2,
        address: '2 Coffee St',
        reviewCount: 5,
        photoUrls: [],
        taxonomyTags: [{ id: 'quiet', label: 'Quiet', labelZh: '安靜', dimension: 'vibe' }],
        isOpen: false,
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
        menuUrl: null,
        mrt: null,
      },
      {
        id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
        name: 'WiFi & Quiet Cafe',
        slug: 'wifi-quiet-cafe',
        latitude: 25.06,
        longitude: 121.59,
        rating: 4.8,
        address: '3 Coffee St',
        reviewCount: 20,
        photoUrls: [],
        taxonomyTags: [
          { id: 'wifi_available', label: 'WiFi', labelZh: '有WiFi', dimension: 'functionality' },
          { id: 'quiet', label: 'Quiet', labelZh: '安靜', dimension: 'vibe' },
        ],
        isOpen: true,
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
        menuUrl: null,
        mrt: null,
      },
      {
        id: 'e5f6a7b8-c9d0-1234-ef01-345678901234',
        name: '老派咖啡 Old School',
        slug: 'old-school',
        latitude: 25.07,
        longitude: 121.60,
        rating: 4.0,
        address: '4 Coffee St',
        reviewCount: 3,
        photoUrls: [],
        taxonomyTags: [],
        isOpen: null, // No opening_hours data — unknown open status
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
        menuUrl: null,
        mrt: null,
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: () => ({ results: [], isLoading: false }),
}));

// Stub browser APIs at the boundary rather than mocking internal hook wrappers
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  configurable: true,
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
});
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const mockCapture = vi.fn();
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div>{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Handle: () => null,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  },
}));

// Mock next/image to render plain img tags in tests
vi.mock('next/image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  default: ({ fill, priority, ...rest }: Record<string, unknown>) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...rest} />;
  },
}));

import FindPage from '../page';

describe('FindPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCapture.mockClear();
    mockSearchParams.delete('view');
    mockSearchParams.delete('q');
    mockSearchParams.delete('filters');
    mockSearchParams.delete('mode');
  });

  afterEach(() => {
    _resetDeviceCapabilityCache();
  });

  it('shows the map view by default (no ?view param)', async () => {
    render(<FindPage />);
    // Map loads progressively — wait for it to appear after dynamic import resolves
    expect(await screen.findByTestId('map-view')).toBeInTheDocument();
  });

  it('shows the list view when ?view=list', () => {
    mockSearchParams.set('view', 'list');
    render(<FindPage />);
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
    // Should show the shop name from the list
    expect(screen.getByText('自由時光咖啡 Liberty Hour')).toBeInTheDocument();
  });

  it('tapping the list toggle updates URL to ?view=list', async () => {
    render(<FindPage />);
    // Wait for map to load before clicking the toggle (toggle is inside the map layout)
    await screen.findByTestId('map-view');
    await userEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('view=list'));
  });

  it('switching views records a view_toggle analytics event so product can track the feature', async () => {
    render(<FindPage />);
    await screen.findByTestId('map-view');
    await userEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(mockCapture).toHaveBeenCalledWith('view_toggled', {
      to_view: 'list',
    });
  });

  it('filters shops by WiFi tag when wifi filter is active', () => {
    mockSearchParams.set('view', 'list');
    mockSearchParams.set('filters', 'wifi');
    render(<FindPage />);

    expect(screen.getByText('WiFi Cafe')).toBeInTheDocument();
    expect(screen.getByText('WiFi & Quiet Cafe')).toBeInTheDocument();
    expect(screen.queryByText('Quiet Place')).not.toBeInTheDocument();
    expect(screen.queryByText('自由時光咖啡 Liberty Hour')).not.toBeInTheDocument();
  });

  it('filters shops by open_now when that filter is active — excludes isOpen: false and isOpen: null', () => {
    mockSearchParams.set('view', 'list');
    mockSearchParams.set('filters', 'open_now');
    render(<FindPage />);

    expect(screen.getByText('WiFi Cafe')).toBeInTheDocument();
    expect(screen.getByText('WiFi & Quiet Cafe')).toBeInTheDocument();
    expect(screen.queryByText('Quiet Place')).not.toBeInTheDocument();
    expect(screen.queryByText('自由時光咖啡 Liberty Hour')).not.toBeInTheDocument();
    // isOpen: null (no opening_hours data) must also be excluded — !== true
    expect(screen.queryByText('老派咖啡 Old School')).not.toBeInTheDocument();
  });

  it('AND-combines multiple filters to show only shops matching all selected criteria', () => {
    mockSearchParams.set('view', 'list');
    mockSearchParams.set('filters', 'wifi,quiet');
    render(<FindPage />);

    expect(screen.getByText('WiFi & Quiet Cafe')).toBeInTheDocument();
    expect(screen.queryByText('WiFi Cafe')).not.toBeInTheDocument();
    expect(screen.queryByText('Quiet Place')).not.toBeInTheDocument();
    expect(screen.queryByText('自由時光咖啡 Liberty Hour')).not.toBeInTheDocument();
  });
});
