import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks so they can be referenced inside vi.mock factories
const { mockQueryRenderedFeatures, mockGetClusterExpansionZoom, mockEaseTo } =
  vi.hoisted(() => ({
    mockQueryRenderedFeatures: vi.fn(() => []),
    // Simulates callback-style API: getClusterExpansionZoom(id, cb) → cb(null, zoom)
    mockGetClusterExpansionZoom: vi.fn(
      (_id: number, cb: (err: Error | null, zoom: number) => void) => cb(null, 15)
    ),
    mockEaseTo: vi.fn(),
  }));

vi.mock('react-map-gl/mapbox', async () => {
  const ReactModule = await import('react');

  const MockMap = ReactModule.forwardRef(function MockMap(
    {
      children,
      onClick,
    }: { children: React.ReactNode; onClick?: (e: unknown) => void },
    ref: React.Ref<unknown>
  ) {
    ReactModule.useImperativeHandle(ref, () => ({
      getMap: () => ({
        queryRenderedFeatures: mockQueryRenderedFeatures,
        getSource: () => ({
          getClusterExpansionZoom: mockGetClusterExpansionZoom,
        }),
        easeTo: mockEaseTo,
      }),
    }));
    return (
      <div
        data-testid="map"
        onClick={(e) =>
          onClick?.({ ...e, point: { x: 50, y: 50 } })
        }
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
    <div
      data-testid={`layer-${id}`}
      data-paint={JSON.stringify(paint ?? {})}
    />
  );

  return { default: MockMap, Source: MockSource, Layer: MockLayer };
});

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

import { MapView } from './map-view';

const REALISTIC_SHOPS = [
  { id: 'shop-1', name: '湛盧咖啡 Zhanlu Coffee', latitude: 25.033, longitude: 121.565 },
  { id: 'shop-2', name: '山頂咖啡 Summit Coffee', latitude: 25.041, longitude: 121.532 },
  { id: 'shop-3', name: '有著落咖啡 Landed Coffee', latitude: 25.051, longitude: 121.548 },
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
    render(<MapView shops={REALISTIC_SHOPS} onPinClick={vi.fn()} selectedShopId={null} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('a visitor opening the map sees all shops passed to the clustering source', () => {
    render(<MapView shops={REALISTIC_SHOPS} onPinClick={vi.fn()} selectedShopId={null} />);

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

    render(<MapView shops={shopsWithNulls} onPinClick={vi.fn()} selectedShopId={null} />);

    const geojson = JSON.parse(
      screen.getByTestId('source').getAttribute('data-geojson') ?? '{}'
    );
    expect(geojson.features).toHaveLength(3);
    expect(geojson.features.find((f: { properties: { id: string } }) => f.properties.id === 'shop-null')).toBeUndefined();
  });

  it('a visitor clicking an individual pin calls onPinClick with the shop ID', async () => {
    const onPinClick = vi.fn();
    mockQueryRenderedFeatures
      .mockReturnValueOnce([]) // no cluster hit
      .mockReturnValueOnce([{ properties: { id: 'shop-2', name: '山頂咖啡 Summit Coffee' }, geometry: { type: 'Point', coordinates: [121.532, 25.041] } }]); // pin hit

    render(<MapView shops={REALISTIC_SHOPS} onPinClick={onPinClick} selectedShopId={null} />);

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

    render(<MapView shops={REALISTIC_SHOPS} onPinClick={vi.fn()} selectedShopId={null} />);

    await userEvent.click(screen.getByTestId('map'));

    expect(mockGetClusterExpansionZoom).toHaveBeenCalledWith(42, expect.any(Function));
    expect(mockEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 15, center: [121.55, 25.04] })
    );
  });

  it('a visitor sees the selected shop pin styled differently via the paint expression', () => {
    render(
      <MapView shops={REALISTIC_SHOPS} onPinClick={vi.fn()} selectedShopId="shop-1" />
    );

    const pinsLayer = screen.getByTestId('layer-shops-pins');
    const paint = JSON.parse(pinsLayer.getAttribute('data-paint') ?? '{}');

    // Paint expression should reference the selectedShopId in the case expression
    const paintJson = JSON.stringify(paint);
    expect(paintJson).toContain('shop-1');
  });

  it('a visitor sees an error message when Mapbox token is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '');
    render(<MapView shops={REALISTIC_SHOPS} onPinClick={vi.fn()} selectedShopId={null} />);
    expect(screen.getByText(/Mapbox token/i)).toBeInTheDocument();
  });
});
