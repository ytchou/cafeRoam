'use client';
import { useMemo } from 'react';
import MapGL, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Coffee, MapPin as MapPinIcon } from 'lucide-react';
import type { ListPin } from '@/lib/hooks/use-list-pins';

interface FavoritesMiniMapProps {
  pins: ListPin[];
  totalShops: number;
  onPinClick?: (listId: string) => void;
}

const TAIPEI_CENTER = { latitude: 25.033, longitude: 121.565 };
const LIST_COLORS = ['#E06B3F', '#5B7FA6', '#5B9B6A'] as const;

export function FavoritesMiniMap({
  pins,
  totalShops,
  onPinClick,
}: FavoritesMiniMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const listColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const pin of pins) {
      if (!map.has(pin.listId)) {
        map.set(pin.listId, LIST_COLORS[i % LIST_COLORS.length]);
        i++;
      }
    }
    return map;
  }, [pins]);

  if (!mapboxToken) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[20px] bg-[var(--muted)] text-sm text-[var(--text-tertiary)]">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden rounded-[20px]">
      <MapGL
        mapboxAccessToken={mapboxToken}
        initialViewState={{ ...TAIPEI_CENTER, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactive={true}
        attributionControl={false}
      >
        {pins.map((pin) => {
          const color = listColorMap.get(pin.listId) ?? LIST_COLORS[0];
          return (
            <Marker
              key={pin.shopId}
              longitude={pin.lng}
              latitude={pin.lat}
              anchor="center"
              onClick={onPinClick ? () => onPinClick(pin.listId) : undefined}
            >
              <div
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
                style={{ backgroundColor: color }}
              >
                <Coffee className="h-3.5 w-3.5 text-white" />
              </div>
            </Marker>
          );
        })}
      </MapGL>
      {/* Badge overlay */}
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
        <MapPinIcon className="h-3 w-3" />
        {totalShops} shops saved
      </div>
    </div>
  );
}
