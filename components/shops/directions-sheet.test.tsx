import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="drawer">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => <div />,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drawer-content">{children}</div>
    ),
    Handle: () => <div />,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  },
}));

vi.mock('@/lib/utils/mrt', () => ({
  nearestMrtStation: vi.fn(() => ({
    id: 'BL12',
    name_zh: '東門',
    name_en: 'Dongmen',
    line: 'BL/R',
    lat: 25.03364,
    lng: 121.52991,
    dist: 0.18,
  })),
}));

vi.mock('@/components/shops/shop-map-thumbnail', () => ({
  ShopMapThumbnail: () => <div data-testid="map-thumbnail" />,
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { DirectionsSheet } from './directions-sheet';

const shop = {
  id: 'shop-abc',
  name: '日光珈琲',
  latitude: 25.033,
  longitude: 121.565,
};

describe('DirectionsSheet', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test-token');
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows a static map thumbnail', () => {
    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);
    expect(screen.getByTestId('map-thumbnail')).toBeInTheDocument();
  });

  it('fetches walking and driving directions from Mapbox', async () => {
    const durationResponse = (seconds: number) => ({
      ok: true,
      json: async () => ({ routes: [{ duration: seconds, distance: 500 }] }),
    });
    mockFetch
      .mockResolvedValueOnce(durationResponse(420)) // walk
      .mockResolvedValueOnce(durationResponse(180)) // drive
      .mockResolvedValueOnce(durationResponse(240)); // mrt walk

    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);

    await waitFor(() => {
      expect(screen.getByText(/7 min walk/i)).toBeInTheDocument();
      expect(screen.getByText(/3 min drive/i)).toBeInTheDocument();
    });
  });

  it('shows the nearest MRT station name', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ duration: 300, distance: 400 }] }),
    });

    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);

    await waitFor(() => {
      expect(screen.getByText(/Dongmen/i)).toBeInTheDocument();
    });
  });

  it('renders Google Maps and Apple Maps deep link buttons', () => {
    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);
    expect(screen.getByRole('link', { name: /google maps/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apple maps/i })).toBeInTheDocument();
  });
});
