'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import { useListShops } from '@/lib/hooks/use-list-shops';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { RenameListDialog } from '@/components/lists/rename-list-dialog';
import { ListDetailMobileLayout } from '@/components/lists/list-detail-mobile-layout';
import { ListDetailDesktopLayout } from '@/components/lists/list-detail-desktop-layout';

export default function ListDetailPage() {
  const { listId } = useParams<{ listId: string }>();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { lists, renameList } = useUserLists();
  const { shops, isLoading } = useListShops(listId);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  const list = lists.find((l) => l.id === listId);

  function handleBack() {
    router.push('/lists');
  }

  if (!list && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--text-tertiary)]">List not found</p>
      </div>
    );
  }

  const listName = list?.name ?? 'Loading...';

  return (
    <>
      {isDesktop ? (
        <ListDetailDesktopLayout
          listName={listName}
          shops={shops}
          selectedShopId={selectedShopId}
          onShopClick={setSelectedShopId}
          onBack={handleBack}
        />
      ) : (
        <ListDetailMobileLayout
          listName={listName}
          shops={shops}
          selectedShopId={selectedShopId}
          onShopClick={setSelectedShopId}
          onBack={handleBack}
        />
      )}

      {renaming && list && (
        <RenameListDialog
          listId={list.id}
          currentName={list.name}
          open={renaming}
          onOpenChange={setRenaming}
          onRename={renameList}
        />
      )}
    </>
  );
}
