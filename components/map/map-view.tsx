'use client';
import { useMemo, useState, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import type { ViewStateChangeEvent } from 'react-map-gl/mapbox';
import { Coffee } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Shop {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

interface MappableShop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapViewProps {
  shops: Shop[];
  onPinClick: (shopId: string) => void;
  selectedShopId: string | null;
  mapStyle?: string;
}

const PIN_DEFAULT_SIZE = 40;
const PIN_SELECTED_SIZE = 44;
const PIN_DEFAULT_COLOR = '#8B5E3C';
const PIN_SELECTED_COLOR = '#FF6B6B';
const TIP_HEIGHT = 10;

function CoffeePinIcon({ selected }: { selected: boolean }) {
  const size = selected ? PIN_SELECTED_SIZE : PIN_DEFAULT_SIZE;
  const color = selected ? PIN_SELECTED_COLOR : PIN_DEFAULT_COLOR;
  const iconSize = Math.round(size * 0.5);
  const radius = size / 2;

  return (
    <svg
      width={size}
      height={size + TIP_HEIGHT}
      viewBox={`0 0 ${size} ${size + TIP_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx={radius} cy={radius} r={radius} fill={color} />
      <polygon
        points={`${radius - 6},${size - 2} ${radius},${size + TIP_HEIGHT} ${radius + 6},${size - 2}`}
        fill={color}
      />
      <foreignObject
        x={(size - iconSize) / 2}
        y={(size - iconSize) / 2}
        width={iconSize}
        height={iconSize}
      >
        <Coffee
          size={iconSize}
          color="white"
          strokeWidth={2}
          style={{ display: 'block' }}
        />
      </foreignObject>
    </svg>
  );
}

export function MapView({
  shops,
  onPinClick,
  selectedShopId,
  mapStyle = 'mapbox://styles/mapbox/light-v11',
}: MapViewProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [bounds, setBounds] = useState<Bounds | null>(null);

  const handleMove = useCallback((e: ViewStateChangeEvent) => {
    const map = e.target;
    const b = map.getBounds();
    if (b) {
      setBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    }
  }, []);

  const visibleShops = useMemo((): MappableShop[] => {
    const mappable = shops.filter(
      (s): s is MappableShop => s.latitude != null && s.longitude != null
    );
    if (!bounds) return mappable;
    return mappable.filter(
      (s) =>
        s.latitude >= bounds.south &&
        s.latitude <= bounds.north &&
        s.longitude >= bounds.west &&
        s.longitude <= bounds.east
    );
  }, [shops, bounds]);

  if (!mapboxToken) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        地圖無法載入：缺少 Mapbox token
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={mapboxToken}
      initialViewState={{ longitude: 121.5654, latitude: 25.033, zoom: 13 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      onMove={handleMove}
    >
      {visibleShops.map((shop) => {
        const isSelected = shop.id === selectedShopId;
        return (
          <Marker
            key={shop.id}
            longitude={shop.longitude}
            latitude={shop.latitude}
            anchor="bottom"
            onClick={() => onPinClick(shop.id)}
          >
            <button
              data-selected={isSelected || undefined}
              aria-label={shop.name}
              className="cursor-pointer border-none bg-transparent p-0"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <CoffeePinIcon selected={isSelected} />
            </button>
          </Marker>
        );
      })}
    </Map>
  );
}
