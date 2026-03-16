import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/lib/hooks/use-shops', () => ({
  useShops: () => ({
    shops: [
      {
        id: '1',
        name: 'Test Cafe',
        latitude: 25.03,
        longitude: 121.56,
        rating: 4.5,
        slug: 'test-cafe',
        photoUrls: [],
        mrt: null,
        address: '',
        phone: null,
        website: null,
        openingHours: null,
        reviewCount: 0,
        priceRange: null,
        description: null,
        menuUrl: null,
        taxonomyTags: [],
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
}));

vi.mock('@/lib/hooks/use-search', () => ({
  useSearch: () => ({ results: [], isLoading: false }),
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

vi.mock('@/components/map/map-view', () => ({
  MapView: ({ shops }: { shops: unknown[] }) => (
    <div data-testid="map-view">Map with {shops.length} pins</div>
  ),
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const StubMapView = (props: Record<string, unknown>) => (
      <div data-testid="map-view">
        Map with {(props.shops as unknown[])?.length ?? 0} pins
      </div>
    );
    return StubMapView;
  },
}));

import FindPage from './page';

describe('Find page (map)', () => {
  it('When a user opens the Find tab, they see the map', () => {
    render(<FindPage />);
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('When a user opens the Find tab, there is no list/map toggle button', () => {
    render(<FindPage />);
    expect(screen.queryByRole('button', { name: /list/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /map/i })).not.toBeInTheDocument();
  });

  it('When a user opens the Find tab, they see the search bar', () => {
    render(<FindPage />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
