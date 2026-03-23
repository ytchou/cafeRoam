'use client';
import { useState, Suspense } from 'react';
import { Drawer } from 'vaul';
import { ChevronLeft } from 'lucide-react';
import { MapViewDynamic as MapView } from '@/components/map/map-view-dynamic';
import { FavoritesShopRow } from './favorites-shop-row';
import type { ListShop } from '@/lib/hooks/use-list-shops';

interface ListDetailMobileLayoutProps {
  listName: string;
  shops: ListShop[];
  selectedShopId: string | null;
  onShopClick: (id: string) => void;
  onBack: () => void;
}

export function ListDetailMobileLayout({
  listName,
  shops,
  selectedShopId,
  onShopClick,
  onBack,
}: ListDetailMobileLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(true);
  const shopCount = shops.length;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
              地圖載入中...
            </div>
          }
        >
          <MapView
            shops={shops}
            onPinClick={onShopClick}
            selectedShopId={selectedShopId}
          />
        </Suspense>
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

      {/* Vaul bottom sheet */}
      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
        <Drawer.Portal>
          <Drawer.Content className="fixed right-0 bottom-0 left-0 z-30 flex max-h-[45vh] flex-col rounded-t-2xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.10)]">
            <Drawer.Handle />
            <Drawer.Title className="sr-only">{listName} shops</Drawer.Title>

            {/* Sheet header */}
            <div className="flex items-center gap-2 px-5 pb-2 pt-1">
              <span className="font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--foreground)]">
                {listName}
              </span>
            </div>

            {/* Scrollable shop list */}
            <div className="flex-1 overflow-y-auto">
              {shops.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 px-6 py-8 text-center">
                  <p className="font-[family-name:var(--font-body)] text-sm font-medium text-[var(--foreground)]">
                    No shops in this list
                  </p>
                  <p className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
                    Go explore and save some shops!
                  </p>
                </div>
              ) : (
                shops.map((shop) => (
                  <FavoritesShopRow
                    key={shop.id}
                    shop={shop}
                    onClick={() => onShopClick(shop.id)}
                    selected={selectedShopId === shop.id}
                  />
                ))
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
