import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FavoritesMiniMap } from './favorites-mini-map';

// Mock react-map-gl the same way MapView does
vi.mock('react-map-gl/mapbox', () => {
  const MockMap = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="minimap">{children}</div>
  );
  const MockMarker = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="pin">{children}</div>
  );
  return { default: MockMap, Marker: MockMarker };
});

const pins = [
  { listId: 'list-1', shopId: 'shop-1', lat: 25.033, lng: 121.565 },
  { listId: 'list-1', shopId: 'shop-2', lat: 25.04, lng: 121.57 },
  { listId: 'list-2', shopId: 'shop-3', lat: 25.02, lng: 121.55 },
];

describe('FavoritesMiniMap', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test'));
  afterEach(() => vi.unstubAllEnvs());

  it('a user sees a map with pins for all saved shops', () => {
    render(<FavoritesMiniMap pins={pins} totalShops={12} />);
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
    expect(screen.getAllByTestId('pin')).toHaveLength(3);
  });

  it('a user sees the total saved shops badge', () => {
    render(<FavoritesMiniMap pins={pins} totalShops={12} />);
    expect(screen.getByText(/12 shops saved/)).toBeInTheDocument();
  });

  it('shows a fallback when Mapbox token is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '');
    render(<FavoritesMiniMap pins={pins} totalShops={5} />);
    expect(screen.queryByTestId('minimap')).not.toBeInTheDocument();
  });
});
