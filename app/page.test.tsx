import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({ user: null, isLoading: false }),
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

  it('When a user opens the Find tab, the map/list toggle buttons are present', () => {
    render(<FindPage />);
    expect(
      screen.getByRole('button', { name: /list view/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /map view/i })
    ).toBeInTheDocument();
  });

  it('When a user opens the Find tab, they see the search bar', () => {
    render(<FindPage />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });
});
