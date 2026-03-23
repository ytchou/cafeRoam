'use client';
import { useState, useMemo, Suspense } from 'react';
import { ChevronLeft } from 'lucide-react';
import { HeaderNav } from '@/components/navigation/header-nav';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import { FavoritesShopRow } from './favorites-shop-row';
import type { MappableLayoutShop } from '@/lib/types';
import type { ListShop } from '@/lib/hooks/use-list-shops';

interface ListDetailDesktopLayoutProps {
  listName: string;
  shops: ListShop[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  onBack: () => void;
}

export function ListDetailDesktopLayout({
  listName,
  shops,
  selectedShopId,
  onShopClick,
  onBack,
}: ListDetailDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const shopCount = shops.length;
  const countLabel = shopCount === 1 ? '1 shop' : `${shopCount} shops`;

  const mapPins = useMemo(
    () =>
      shops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        latitude: shop.latitude,
        longitude: shop.longitude,
      })),
    [shops]
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <HeaderNav activeTab="favorites" />

      <div className="flex flex-1 overflow-hidden pt-16">
        {!panelCollapsed && (
          <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white">
            <div className="flex flex-col px-5 pt-4 pb-2">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>My Favorites</span>
              </button>

              <hr className="my-3 border-[var(--border)]" />

              <h1 className="font-[family-name:var(--font-body)] text-[22px] font-bold text-[var(--foreground)]">
                {listName}
              </h1>
              <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[var(--text-secondary)]">
                {countLabel}
              </p>

              <hr className="my-3 border-[var(--border)]" />
            </div>

            <div className="flex-1 divide-y divide-[var(--border)] overflow-y-auto">
              {shops.map((shop) => (
                <FavoritesShopRow
                  key={shop.id}
                  shop={shop}
                  onClick={() => onShopClick(shop.id)}
                  selected={shop.id === selectedShopId}
                />
              ))}
            </div>
          </div>
        )}

        <CollapseToggle
          collapsed={panelCollapsed}
          onClick={() => setPanelCollapsed((c) => !c)}
        />

        <div className="relative flex-1">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                地圖載入中...
              </div>
            }
          >
            <MapView
              shops={mapPins as MappableLayoutShop[]}
              onPinClick={onShopClick}
              selectedShopId={selectedShopId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
