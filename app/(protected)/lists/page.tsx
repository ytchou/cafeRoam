'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import { useListPins } from '@/lib/hooks/use-list-pins';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { RenameListDialog } from '@/components/lists/rename-list-dialog';
import { CreateListDialog } from '@/components/lists/create-list-dialog';
import { FavoritesMobileLayout } from '@/components/lists/favorites-mobile-layout';
import { FavoritesDesktopLayout } from '@/components/lists/favorites-desktop-layout';

export default function ListsPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { lists, isLoading, createList, deleteList, renameList } = useUserLists();
  const { pins } = useListPins();
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  async function handleCreate(name: string) {
    try {
      await createList(name);
      toast.success('List created');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create list';
      toast.error(message.includes('Maximum') ? "You've reached the 3-list limit" : message);
    }
  }

  async function handleDelete(listId: string, listName: string) {
    if (!confirm(`Delete "${listName}"? This won't remove the shops.`)) return;
    try {
      await deleteList(listId);
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete list');
    }
  }

  async function handleRename(listId: string, name: string) {
    try {
      await renameList(listId, name);
      setRenaming(null);
    } catch {
      toast.error('Failed to rename list');
    }
  }

  function handleViewList(listId: string) {
    router.push(`/lists/${listId}`);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-tertiary)]">Loading...</p>
      </div>
    );
  }

  return (
    <>
      {isDesktop ? (
        <FavoritesDesktopLayout
          lists={lists}
          pins={pins}
          selectedShopId={selectedShopId}
          onShopClick={setSelectedShopId}
          onCreateList={() => setCreating(true)}
          onDeleteList={handleDelete}
          onRenameList={(id) => {
            const list = lists.find((l) => l.id === id);
            if (list) setRenaming({ id, name: list.name });
          }}
          onViewList={handleViewList}
        />
      ) : (
        <FavoritesMobileLayout
          lists={lists}
          pins={pins}
          onCreateList={() => setCreating(true)}
          onDeleteList={handleDelete}
          onRenameList={(id) => {
            const list = lists.find((l) => l.id === id);
            if (list) setRenaming({ id, name: list.name });
          }}
          onViewList={handleViewList}
        />
      )}

      <CreateListDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={handleCreate}
      />

      {renaming && (
        <RenameListDialog
          listId={renaming.id}
          currentName={renaming.name}
          open={!!renaming}
          onOpenChange={(open) => !open && setRenaming(null)}
          onRename={handleRename}
        />
      )}
    </>
  );
}
