import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Mock all heavy dependencies at boundaries
vi.mock('@/lib/hooks/use-shops', () => ({
  useShops: vi.fn(() => ({ shops: [] })),
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
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));
vi.mock('@/lib/hooks/use-device-capability', () => ({
  useDeviceCapability: vi.fn(() => ({ isLowEnd: true, deviceMemory: 2 })),
}));
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: vi.fn(() => ({ capture: vi.fn() })),
}));
vi.mock('@/lib/analytics/ga4-events', () => ({
  trackSearch: vi.fn(),
  trackSignupCtaClick: vi.fn(),
}));
vi.mock('@/components/seo/WebsiteJsonLd', () => ({
  WebsiteJsonLd: () => null,
}));
vi.mock('@/components/map/map-with-fallback', () => ({
  MapWithFallback: (props: { view: string }) => (
    <div data-testid="map-with-fallback" data-view={props.view} />
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}));

import FindPage from '../page';

describe('FindPage uses MapWithFallback', () => {
  it('renders MapWithFallback instead of direct layout components', () => {
    render(<FindPage />);
    expect(screen.getByTestId('map-with-fallback')).toBeInTheDocument();
  });
});
