import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dynamic imports (MapView is dynamically imported with ssr: false)
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockMap = (props: Record<string, unknown>) => (
      <div data-testid="map-view" data-selected={props.selectedShopId as string}>
        {(props.shops as Array<{ id: string }>)?.map((s) => (
          <button key={s.id} onClick={() => (props.onPinClick as (id: string) => void)?.(s.id)}>
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

vi.mock('@/lib/hooks/use-geolocation', () => ({
  useGeolocation: () => ({
    requestLocation: vi.fn(),
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  }),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
}));

const mockCapture = vi.fn();
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({
      children,
      open,
    }: {
      children: React.ReactNode;
      open: boolean;
    }) => (open ? <div>{children}</div> : null),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => null,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Handle: () => null,
    Title: ({ children }: { children: React.ReactNode }) => (
      <h2>{children}</h2>
    ),
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

  it('shows the map view by default (no ?view param)', () => {
    render(<FindPage />);
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('view=list'));
  });

  it('switching views records a view_toggle analytics event so product can track the feature', async () => {
    render(<FindPage />);
    await userEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(mockCapture).toHaveBeenCalledWith('view_toggled', {
      to_view: 'list',
    });
  });
});
