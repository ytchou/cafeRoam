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

// react-map-gl/mapbox is loaded lazily by ShopMapThumbnail on desktop — mock
// the external library boundary so jsdom doesn't choke on canvas/WebGL.
vi.mock('react-map-gl/mapbox', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="interactive-map">{children}</div>
  ),
  Marker: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// use-media-query wraps window.matchMedia (browser API boundary) — stub to mobile
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
    // ShopMapThumbnail on mobile renders a Mapbox static image
    expect(screen.getByRole('img', { name: /map showing 日光珈琲/i })).toBeInTheDocument();
  });

  it('a user who has shared their location sees walk and drive times from Mapbox', async () => {
    const durationResponse = (seconds: number) => ({
      ok: true,
      json: async () => ({ routes: [{ duration: seconds, distance: 500 }] }),
    });
    mockFetch
      .mockResolvedValueOnce(durationResponse(420)) // walk
      .mockResolvedValueOnce(durationResponse(180)) // drive
      .mockResolvedValueOnce(durationResponse(240)); // mrt walk

    render(
      <DirectionsSheet
        open={true}
        onClose={vi.fn()}
        shop={shop}
        userLat={25.04}
        userLng={121.55}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/7 min walk/i)).toBeInTheDocument();
      expect(screen.getByText(/3 min drive/i)).toBeInTheDocument();
    });
  });

  it('a user without location only fetches the MRT leg, not walk/drive routes', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ duration: 300, distance: 400 }] }),
    });

    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);

    await waitFor(() => {
      // MRT row should still appear
      expect(screen.getByText(/[A-Za-z]+ \([^\)]+\) ·/)).toBeInTheDocument();
    });
    // Only one fetch call — MRT walk; walk/drive skipped without user location
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('walking');
    expect(mockFetch.mock.calls[0][0]).not.toContain('driving-traffic');
  });

  it('shows the nearest MRT station using real station data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ duration: 300, distance: 400 }] }),
    });

    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);

    // nearestMrtStation runs against real taipei-mrt-stations.json — any station
    // near 25.033, 121.565 (central Taipei) should appear with the format:
    // "{name_en} ({name_zh}) · {line} · ~N min walk"
    await waitFor(() => {
      // Match the station row pattern: English name followed by Chinese in parens
      expect(
        screen.getByText(/[A-Za-z]+ \([^\)]+\) ·/)
      ).toBeInTheDocument();
    });
  });

  it('renders Google Maps and Apple Maps deep link buttons', () => {
    render(<DirectionsSheet open={true} onClose={vi.fn()} shop={shop} />);
    expect(screen.getByRole('link', { name: /google maps/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /apple maps/i })).toBeInTheDocument();
  });
});
