'use client';
import { FavoritesMiniMap } from './favorites-mini-map';
import { FavoritesListCard } from './favorites-list-card';
import { EmptySlotCard } from './empty-slot-card';
import { BottomNav } from '@/components/navigation/bottom-nav';
import type { ListPin } from '@/lib/hooks/use-list-pins';

const MAX_LISTS = 3;

interface List {
  id: string;
  name: string;
  items: { shop_id: string }[];
}

interface FavoritesMobileLayoutProps {
  lists: List[];
  pins: ListPin[];
  onCreateList: () => void;
  onDeleteList: (listId: string, listName: string) => void;
  onRenameList: (listId: string) => void;
  onViewList: (listId: string) => void;
}

export function FavoritesMobileLayout({
  lists,
  pins,
  onCreateList,
  onDeleteList,
  onRenameList,
  onViewList,
}: FavoritesMobileLayoutProps) {
  const remainingSlots = MAX_LISTS - lists.length;
  const totalShops = pins.length;

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background,#F5F3F0)]">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold text-[var(--foreground)]">
              收藏
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              My Saved Lists
            </p>
          </div>
          <span className="rounded-full bg-[#F5EDE4] px-3 py-1 text-sm font-semibold text-[var(--map-pin)]">
            {lists.length} / {MAX_LISTS}
          </span>
        </div>
      </div>

      {/* Mini Map */}
      <div className="px-5">
        <FavoritesMiniMap
          pins={pins}
          totalShops={totalShops}
          onPinClick={onViewList}
        />
      </div>

      {/* Lists section */}
      <div className="flex-1 px-5 pt-5 pb-32">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-bold text-[var(--foreground)]">
            My Lists
          </h2>
          {remainingSlots > 0 && (
            <button
              onClick={onCreateList}
              className="rounded-full bg-[#C8F0D8] px-3 py-1 text-sm font-medium text-[#3D8A5A]"
            >
              + New List
            </button>
          )}
        </div>

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

      <BottomNav />
    </div>
  );
}
