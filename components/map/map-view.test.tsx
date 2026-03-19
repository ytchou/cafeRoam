import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-map-gl/mapbox', () => {
  const MockMap = ({
    children,
    onMove,
  }: {
    children: React.ReactNode;
    onMove?: (e: unknown) => void;
  }) => {
    if (onMove) {
      setTimeout(() => {
        onMove({
          viewState: { longitude: 121.5654, latitude: 25.033, zoom: 13 },
          target: {
            getBounds: () => ({
              getNorth: () => 25.06,
              getSouth: () => 25.0,
              getEast: () => 121.6,
              getWest: () => 121.53,
            }),
          },
        });
      }, 0);
    }
    return <div data-testid="map">{children}</div>;
  };
  MockMap.displayName = 'MockMap';
  const MockMarker = ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    longitude: number;
    latitude: number;
    anchor?: string;
  }) => (
    <div
      data-testid="marker"
      data-lng={props.longitude}
      data-lat={props.latitude}
      onClick={onClick}
    >
      {children}
    </div>
  );
  MockMarker.displayName = 'MockMarker';
  return { default: MockMap, Marker: MockMarker };
});

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}));

import { MapView } from './map-view';

const SHOPS = [
  { id: '1', name: '明星咖啡館', latitude: 25.033, longitude: 121.55 },
  { id: '2', name: '日出茶太', latitude: 26.0, longitude: 122.0 },
  { id: '3', name: '珈琲茶館', latitude: 25.02, longitude: 121.56 },
];

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
];

describe('MapView', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test-token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('a visitor opening the map sees all shop pins before any panning occurs', () => {
    render(
      <MapView shops={SHOPS} onPinClick={vi.fn()} selectedShopId={null} />
    );
    const markers = screen.getAllByTestId('marker');
    expect(markers.length).toBe(3);
  });

  it('a visitor opening the map sees the map canvas', () => {
    render(
      <MapView shops={SHOPS} onPinClick={vi.fn()} selectedShopId={null} />
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('a visitor sees a pin for each shop on the map', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId={null}
      />
    );

    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '湛盧咖啡 Zhanlu Coffee' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '山頂咖啡 Summit Coffee' })
    ).toBeInTheDocument();
  });

  it('a visitor clicking a pin calls onPinClick with the shop ID', async () => {
    const onPinClick = vi.fn();
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={onPinClick}
        selectedShopId={null}
      />
    );

    await userEvent.click(
      screen.getByRole('button', { name: '湛盧咖啡 Zhanlu Coffee' })
    );

    expect(onPinClick).toHaveBeenCalledWith('shop-1');
  });

  it('a visitor tapping a pin sees the selected pin highlighted in coral', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-1"
      />
    );
    const selectedPin = screen.getByRole('button', {
      name: '湛盧咖啡 Zhanlu Coffee',
    });
    expect(selectedPin).toHaveAttribute('data-selected', 'true');
  });

  it('a visitor sees unselected pins without the selected data attribute', () => {
    render(
      <MapView
        shops={REALISTIC_SHOPS}
        onPinClick={vi.fn()}
        selectedShopId="shop-1"
      />
    );
    const unselectedPin = screen.getByRole('button', {
      name: '山頂咖啡 Summit Coffee',
    });
    expect(unselectedPin).not.toHaveAttribute('data-selected');
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
});
