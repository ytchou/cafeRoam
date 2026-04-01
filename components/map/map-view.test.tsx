import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks so they can be referenced inside vi.mock factories
const {
  mockQueryRenderedFeatures,
  mockGetClusterExpansionZoom,
  mockEaseTo,
  mockFlyTo,
} = vi.hoisted(() => ({
  mockQueryRenderedFeatures: vi.fn(() => [] as unknown[]),
  // Simulates callback-style API: getClusterExpansionZoom(id, cb) → cb(null, zoom)
  mockGetClusterExpansionZoom: vi.fn(
    (_id: number, cb: (err: Error | null, zoom: number) => void) => cb(null, 15)
  ),
  mockEaseTo: vi.fn(),
  mockFlyTo: vi.fn(),
}));

vi.mock('react-map-gl/mapbox', async () => {
  const ReactModule = await import('react');

  const MockMap = ReactModule.forwardRef(function MockMap(
    {
      children,
      onClick,
      onLoad,
      onMoveEnd,
    }: {
      children: React.ReactNode;
      onClick?: (e: unknown) => void;
      onLoad?: (e: unknown) => void;
      onMoveEnd?: (e: unknown) => void;
    },
    ref: React.Ref<unknown>
  ) {
    const mapInstance = {
      queryRenderedFeatures: mockQueryRenderedFeatures,
      getSource: () => ({
        getClusterExpansionZoom: mockGetClusterExpansionZoom,
      }),
      easeTo: mockEaseTo,
      flyTo: mockFlyTo,
      getZoom: () => 13,
      getBounds: () => ({
        getNorth: () => 25.06,
        getSouth: () => 25.01,
        getEast: () => 121.58,
        getWest: () => 121.53,
      }),
    };

    ReactModule.useImperativeHandle(ref, () => ({
      getMap: () => mapInstance,
    }));

    // Fire onLoad after mount to simulate map ready
    ReactModule.useEffect(() => {
      onLoad?.({ target: mapInstance });
    }, []);

    return (
      <div
        data-testid="map"
        onClick={(e) => onClick?.({ ...e, point: { x: 50, y: 50 } })}
        data-onmoveend={onMoveEnd ? 'attached' : undefined}
      >
        {children}
      </div>
    );
  });

  const MockSource = ({
    children,
    id,
    data,
  }: {
    children: React.ReactNode;
    id: string;
    data: unknown;
    cluster?: boolean;
    clusterMaxZoom?: number;
    clusterRadius?: number;
  }) => (
    <div
      data-testid="source"
      data-source-id={id}
      data-geojson={JSON.stringify(data)}
    >
      {children}
    </div>
  );

  const MockLayer = ({ id, paint }: { id: string; paint?: unknown }) => (
    <div data-testid={`layer-${id}`} data-paint={JSON.stringify(paint ?? {})} />
  );

  return { default: MockMap, Source: MockSource, Layer: MockLayer };
});

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

import { MapView } from './map-view';

const REALISTIC_SHOPS = [
  {
    id: 'shop-1',
    name: '湛盧咖啡 Zhanlu Coffee',
    latitude: 25.033,
    longitude: 121.565,
  },
  {
    id: 'shop-2',
    name: '山頂咖啡 Summit Coffee',
    latitude: 25.041,
    longitude: 121.532,
  },
  {
    id: 'shop-3',
    name: '有著落咖啡 Landed Coffee',
    latitude: 25.051,
    longitude: 121.548,
  },
];

describe('MapView', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test-token');
    mockQueryRenderedFeatures.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('a visitor opening the map sees the map canvas', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('a visitor opening the map sees all shops passed to the clustering source', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    const source = screen.getByTestId('source');
    const geojson = JSON.parse(source.getAttribute('data-geojson') ?? '{}');

    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(3);
    expect(geojson.features[0].properties.id).toBe('shop-1');
    expect(geojson.features[0].properties.name).toBe('湛盧咖啡 Zhanlu Coffee');
    expect(geojson.features[0].geometry.coordinates).toEqual([121.565, 25.033]);
  });

  it('a visitor does not see pins for shops without coordinates', () => {
    const shopsWithNulls = [
      ...REALISTIC_SHOPS,
      { id: 'shop-null', name: '無座標咖啡', latitude: null, longitude: null },
    ];

    render(
      <MapView
        shops={shopsWithNulls}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    const geojson = JSON.parse(
      screen.getByTestId('source').getAttribute('data-geojson') ?? '{}'
    );
    expect(geojson.features).toHaveLength(3);
    expect(
      geojson.features.find(
        (f: { properties: { id: string } }) => f.properties.id === 'shop-null'
      )
    ).toBeUndefined();
  });

  it('a visitor clicking an individual pin calls onPinClick with the shop ID', async () => {
    const onPinClick = vi.fn();
    mockQueryRenderedFeatures
      .mockReturnValueOnce([]) // no cluster hit
      .mockReturnValueOnce([
        {
          properties: { id: 'shop-2', name: '山頂咖啡 Summit Coffee' },
          geometry: { type: 'Point', coordinates: [121.532, 25.041] },
        },
      ]); // pin hit

    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={onPinClick}
        selectedShopId={null}
      />
    );

    await userEvent.click(screen.getByTestId('map'));

    expect(onPinClick).toHaveBeenCalledWith('shop-2');
  });

  it('a visitor clicking a cluster zooms in to expand it', async () => {
    mockQueryRenderedFeatures.mockReturnValueOnce([
      {
        properties: { cluster_id: 42, point_count: 5 },
        geometry: { type: 'Point', coordinates: [121.55, 25.04] },
      },
    ]);

    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    await userEvent.click(screen.getByTestId('map'));

    expect(mockGetClusterExpansionZoom).toHaveBeenCalledWith(
      42,
      expect.any(Function)
    );
    expect(mockEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 15, center: [121.55, 25.04] })
    );
  });

  it('a visitor sees the selected shop pin styled differently via the paint expression', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-1"
      />
    );

    const pinsLayer = screen.getByTestId('layer-shops-pins');
    const paint = JSON.parse(pinsLayer.getAttribute('data-paint') ?? '{}');

    // Paint expression should reference the selectedShopId in the case expression
    const paintJson = JSON.stringify(paint);
    expect(paintJson).toContain('shop-1');
  });

  it('a visitor sees an error message when Mapbox token is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '');
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );
    expect(screen.getByText(/Mapbox token/i)).toBeInTheDocument();
  });

  it('selecting a shop from the list flies the map to that pin', () => {
    const { rerender } = render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    rerender(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-2"
      />
    );

    expect(mockFlyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [121.532, 25.041],
      })
    );
  });

  it('selecting a shop at low zoom flies to clusterMaxZoom + 1 to uncluster', () => {
    const { rerender } = render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    rerender(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-1"
      />
    );

    // Mock getZoom returns 13 which is <= CLUSTER_MAX_ZOOM (14), so zoom should be 15
    expect(mockFlyTo).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [121.565, 25.033],
        zoom: 15,
      })
    );
  });

  it('deselecting a shop (null) does not trigger flyTo', () => {
    const { rerender } = render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-1"
      />
    );

    mockFlyTo.mockClear();

    rerender(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    expect(mockFlyTo).not.toHaveBeenCalled();
  });

  it('fires onBoundsChange with map bounds on initial load', () => {
    const onBoundsChange = vi.fn();
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
        onBoundsChange={onBoundsChange}
      />
    );

    expect(onBoundsChange).toHaveBeenCalledWith({
      north: 25.06,
      south: 25.01,
      east: 121.58,
      west: 121.53,
    });
  });

  it('does not crash when onBoundsChange is not provided', () => {
    expect(() =>
      render(
        <MapView
          shops={REALISTIC_SHOPS}
          onPinClick={vi.fn()}
          selectedShopId={null}
        />
      )
    ).not.toThrow();
  });
});
