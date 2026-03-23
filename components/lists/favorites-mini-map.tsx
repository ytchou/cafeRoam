'use client';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin as MapPinIcon } from 'lucide-react';
import type { ListPin } from '@/lib/hooks/use-list-pins';

interface FavoritesMiniMapProps {
  pins: ListPin[];
  totalShops: number;
}

const TAIPEI_CENTER = { latitude: 25.033, longitude: 121.565 };

export function FavoritesMiniMap({ pins, totalShops }: FavoritesMiniMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!mapboxToken) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[20px] bg-[var(--muted)] text-sm text-[var(--text-tertiary)]">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative h-40 overflow-hidden rounded-[20px]">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={{ ...TAIPEI_CENTER, zoom: 12 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        interactive={true}
        attributionControl={false}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.shopId}
            longitude={pin.lng}
            latitude={pin.lat}
            anchor="center"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--map-pin)]">
              <span className="text-[10px] text-white">☕</span>
            </div>
          </Marker>
        ))}
      </Map>
      {/* Badge overlay */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
        <MapPinIcon className="h-3 w-3" />
        {totalShops} shops saved
      </div>
    </div>
  );
}
