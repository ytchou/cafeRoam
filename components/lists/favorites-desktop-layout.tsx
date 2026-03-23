'use client';
import { useState, useMemo, Suspense } from 'react';
import { Plus } from 'lucide-react';
import { HeaderNav } from '@/components/navigation/header-nav';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import { FavoritesShopRow } from './favorites-shop-row';
import type { FavoritesShop } from './favorites-shop-row';
import type { ListPin } from '@/lib/hooks/use-list-pins';

interface FavoritesList {
  id: string;
  user_id: string;
  name: string;
  items: { shop_id: string; added_at: string }[];
  created_at: string;
  updated_at: string;
}

interface FavoritesDesktopLayoutProps {
  lists: FavoritesList[];
  shopsByList: Record<string, FavoritesShop[]>;
  pins: ListPin[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  onCreateList: () => void;
  onDeleteList: (listId: string) => void;
  onRenameList: (listId: string, name: string) => void;
}

export function FavoritesDesktopLayout({
  lists,
  shopsByList,
  pins,
  selectedShopId,
  onShopClick,
  onCreateList,
}: FavoritesDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const mapShops = useMemo(
    () =>
      pins.map((pin) => ({
        id: pin.shopId,
        name: '',
        latitude: pin.lat,
        longitude: pin.lng,
      })),
    [pins]
  );

  return (
    <div className="flex h-screen w-full flex-col">
      <HeaderNav activeTab="favorites" />

      <div className="flex flex-1 overflow-hidden pt-16">
        {!panelCollapsed && (
          <div className="flex w-[420px] shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold text-[var(--foreground)]">
                收藏 Favorites
              </h1>
              <button
                type="button"
                onClick={onCreateList}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--map-pin)] px-3 py-1.5 font-[family-name:var(--font-body)] text-sm font-semibold text-white transition-colors hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                New List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {lists.map((list) => {
                const shops = shopsByList[list.id] ?? [];
                return (
                  <section key={list.id}>
                    <div className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--muted)] px-5 py-2">
                      <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--foreground)]">
                        {list.name}
                      </span>
                      <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-tertiary)]">
                        {shops.length}
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--border)]">
                      {shops.map((shop) => (
                        <FavoritesShopRow
                          key={shop.id}
                          shop={shop}
                          onClick={() => onShopClick(shop.id)}
                          selected={shop.id === selectedShopId}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
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
              shops={mapShops}
              onPinClick={onShopClick}
              selectedShopId={selectedShopId}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
