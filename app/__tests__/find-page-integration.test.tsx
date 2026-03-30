import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Next.js boundaries
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMapView = () => <div data-testid="map-view" />;
    MockMapView.displayName = 'MockMapView';
    return MockMapView;
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

// External analytics boundaries
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: vi.fn(() => ({ capture: vi.fn() })),
}));
vi.mock('@/lib/analytics/ga4-events', () => ({
  trackSearch: vi.fn(),
  trackSignupCtaClick: vi.fn(),
}));

// Data hooks — make real HTTP calls; mock at the fetch layer since MSW not configured
vi.mock('@/lib/hooks/use-shops', () => ({
  useShops: vi.fn(() => ({
    shops: [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: '自由時光咖啡 Liberty Hour',
        slug: 'liberty-hour',
        latitude: 25.033,
        longitude: 121.565,
        rating: 4.5,
        address: '台北市中正區重慶南路一段1號',
        reviewCount: 48,
        photoUrls: ['https://example.com/cafe.jpg'],
        taxonomyTags: [],
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2026-01-01',
        phone: null,
        website: null,
        openingHours: null,
        priceRange: null,
        description: null,
      },
    ],
  })),
}));
vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: vi.fn(() => ({ results: [], isLoading: false })),
}));
vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: vi.fn(() => ({
    latitude: null,
    longitude: null,
    requestLocation: vi.fn(),
  })),
}));
vi.mock('@/lib/hooks/use-search-state', () => ({
  useSearchState: vi.fn(() => ({
    query: '',
    mode: null,
    filters: [],
    view: 'map',
    setQuery: vi.fn(),
    toggleFilter: vi.fn(),
    setFilters: vi.fn(),
    setView: vi.fn(),
  })),
}));
vi.mock('@/lib/hooks/use-user', () => ({
  useUser: vi.fn(() => ({ user: null })),
}));
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));
vi.mock('@/components/seo/WebsiteJsonLd', () => ({
  WebsiteJsonLd: () => null,
}));

// Stub browser APIs at the boundary
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
Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  configurable: true,
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
});

import FindPage from '../page';
import { _resetDeviceCapabilityCache } from '@/lib/hooks/use-device-capability';

describe('FindPage map degradation integration', () => {
  afterEach(() => {
    _resetDeviceCapabilityCache();
  });

  it('on a low-end device, shows list view instead of loading the map', () => {
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 1,
      writable: true,
      configurable: true,
    });
    render(<FindPage />);
    expect(screen.getByTestId('list-container')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /載入地圖/i })
    ).toBeInTheDocument();
  });
});
