'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface SaveToListSheetProps {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveToListSheet({
  shopId,
  open,
  onOpenChange,
}: SaveToListSheetProps) {
  const { lists, isInList, saveShop, removeShop, createList } = useUserLists();
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleToggle(listId: string) {
    try {
      if (isInList(listId, shopId)) {
        await removeShop(listId, shopId);
      } else {
        await saveShop(listId, shopId);
      }
    } catch {
      toast.error('Something went wrong');
    }
  }

  async function handleCreate() {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createList(newListName.trim());
      setNewListName('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create list';
      toast.error(
        message.includes('Maximum')
          ? "You've reached the 3-list limit"
          : message
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between border-b border-border-warm px-4 py-4">
          <DrawerTitle className="text-base font-semibold text-text-primary">
            Save to List 收藏
          </DrawerTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-text-meta hover:text-text-body"
            aria-label="Close"
          >
            ✕
          </button>
        </DrawerHeader>

        <div className="py-2">
          {lists.length === 0 && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <div className="mb-3 h-10 w-10 rounded-full bg-surface-card" />
              <p className="mb-1 text-sm font-semibold text-text-primary">
                No lists yet
              </p>
              <p className="mb-4 text-xs text-text-meta">
                Create a list to start saving cafés
              </p>
              <button
                onClick={() => setNewListName(' ')}
                className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Create a list
              </button>
            </div>
          )}

          {lists.map((list) => (
            <label
              key={list.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface-section"
            >
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-surface-card" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {list.name}
                </p>
                <p className="text-xs text-text-meta">
                  {list.items.length} spots
                </p>
              </div>
              <input
                type="checkbox"
                aria-label={list.name}
                checked={isInList(list.id, shopId)}
                onChange={() => handleToggle(list.id)}
                className="h-5 w-5 rounded border-gray-300 accent-brand"
              />
            </label>
          ))}

          {lists.length > 0 && lists.length < 3 && (
            <button
              onClick={() => setNewListName(' ')}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:bg-surface-section"
            >
              <Plus className="h-4 w-4" />
              Create new list
            </button>
          )}

          {lists.length === 3 && (
            <p className="mx-4 mb-2 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
              You&apos;ve reached the 3-list limit
            </p>
          )}
        </div>

        {newListName !== '' && (
          <div className="border-t border-border-warm px-4 py-3">
            <input
              type="text"
              placeholder="Create new list"
              value={newListName === ' ' ? '' : newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="w-full rounded-lg bg-surface-section px-3 py-2 text-sm focus:outline-none"
              disabled={creating}
            />
            {newListName.trim() && (
              <button
                onClick={handleCreate}
                disabled={creating}
                className="mt-2 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {creating ? 'Creating...' : 'Add'}
              </button>
            )}
          </div>
        )}

        <div className="border-t border-border-warm px-4 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full bg-brand py-3 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
