'use client';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ChevronLeft } from 'lucide-react';
import { FavoritesShopRow } from './favorites-shop-row';
import { BottomNav } from '@/components/navigation/bottom-nav';

interface ListDetailShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  review_count: number;
  photo_urls: string[];
  taxonomy_tags: { label_zh?: string; labelZh?: string }[];
  is_open?: boolean | null;
}

interface ListDetailMobileLayoutProps {
  listName: string;
  shops: ListDetailShop[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  onBack: () => void;
}

const MAP_DEFAULTS = {
  longitude: 121.5654,
  latitude: 25.033,
  zoom: 12,
} as const;

export function ListDetailMobileLayout({
  listName,
  shops,
  selectedShopId,
  onShopClick,
  onBack,
}: ListDetailMobileLayoutProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
  const shopCount = shops.length;

  const center = shops.length > 0
    ? { longitude: shops[0].longitude, latitude: shops[0].latitude }
    : { longitude: MAP_DEFAULTS.longitude, latitude: MAP_DEFAULTS.latitude };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <Map
          mapboxAccessToken={token}
          initialViewState={{ ...center, zoom: MAP_DEFAULTS.zoom }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
        >
          {shops.map((shop) => (
            <Marker
              key={shop.id}
              longitude={shop.longitude}
              latitude={shop.latitude}
              onClick={() => onShopClick(shop.id)}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-md transition-transform ${
                  selectedShopId === shop.id
                    ? 'scale-125 bg-[var(--map-pin-selected,#C05A2B)]'
                    : 'bg-[var(--map-pin,#E06B3F)]'
                }`}
              />
            </Marker>
          ))}
        </Map>
      </div>

      {/* Top overlay: back button + list name + count badge */}
      <div className="absolute top-0 right-0 left-0 z-20 bg-gradient-to-b from-white/90 to-transparent px-4 pb-6 pt-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Go back"
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <ChevronLeft className="h-5 w-5 text-[var(--foreground)]" />
          </button>
          <span className="font-[family-name:var(--font-body)] text-base font-semibold text-[var(--foreground)]">
            {listName}
          </span>
          <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
            {shopCount} shops
          </span>
        </div>
      </div>

      {/* Fixed bottom sheet at ~45vh */}
      <div className="fixed bottom-0 left-0 right-0 z-30 h-[45vh] overflow-hidden rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.10)]">
        {/* Drag handle pill */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--muted)]" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center gap-2 px-5 pb-2 pt-1">
          <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--foreground)]">
            {listName}
          </span>
        </div>

        {/* Scrollable shop list */}
        <div className="overflow-y-auto" style={{ height: 'calc(100% - 5rem - 78px)' }}>
          {shops.map((shop) => (
            <FavoritesShopRow
              key={shop.id}
              shop={shop}
              onClick={() => onShopClick(shop.id)}
              selected={selectedShopId === shop.id}
            />
          ))}
        </div>
      </div>

      {/* BottomNav sits at the very bottom, above the sheet */}
      <BottomNav />
    </div>
  );
}
