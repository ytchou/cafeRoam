'use client';
import { useState, useMemo, Suspense } from 'react';
import { Plus } from 'lucide-react';
import { HeaderNav } from '@/components/navigation/header-nav';
import { CollapseToggle } from '@/components/map/collapse-toggle';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import { FavoritesListCard } from './favorites-list-card';
import { EmptySlotCard } from './empty-slot-card';
import type { ListPin } from '@/lib/hooks/use-list-pins';

const MAX_LISTS = 3;

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
  pins: ListPin[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  onCreateList: () => void;
  onDeleteList: (listId: string, listName: string) => void;
  onRenameList: (listId: string) => void;
  onViewList: (listId: string) => void;
}

export function FavoritesDesktopLayout({
  lists,
  pins,
  selectedShopId,
  onShopClick,
  onCreateList,
  onDeleteList,
  onRenameList,
  onViewList,
}: FavoritesDesktopLayoutProps) {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const remainingSlots = MAX_LISTS - lists.length;

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
              {remainingSlots > 0 && (
                <button
                  type="button"
                  onClick={onCreateList}
                  className="flex items-center gap-1.5 rounded-full bg-[#C8F0D8] px-3 py-1.5 font-[family-name:var(--font-body)] text-sm font-semibold text-[#3D8A5A] transition-colors hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New List
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
              <div className="flex flex-col gap-3">
                {lists.map((list) => (
                  <FavoritesListCard
                    key={list.id}
                    id={list.id}
                    name={list.name}
                    itemCount={list.items.length}
                    photoUrls={[]}
                    onRename={() => onRenameList(list.id)}
                    onDelete={() => onDeleteList(list.id, list.name)}
                    onViewOnMap={() => onViewList(list.id)}
                  />
                ))}

                {remainingSlots > 0 && (
                  <EmptySlotCard
                    remainingSlots={remainingSlots}
                    onClick={onCreateList}
                  />
                )}
              </div>
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
