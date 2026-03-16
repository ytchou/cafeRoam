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
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: '山小孩咖啡',
        latitude: 25.0478,
        longitude: 121.5319,
        rating: 4.6,
        slug: 'shan-xiao-hai-ka-fei',
        photoUrls: [],
        mrt: '古亭',
        address: '台北市大安區和平東路一段',
        phone: null,
        website: null,
        openingHours: null,
        reviewCount: 42,
        priceRange: '$$',
        description: null,
        menuUrl: null,
        taxonomyTags: [],
        cafenomadId: null,
        googlePlaceId: null,
        createdAt: '2025-01-15T08:00:00.000Z',
        updatedAt: '2025-01-15T08:00:00.000Z',
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
