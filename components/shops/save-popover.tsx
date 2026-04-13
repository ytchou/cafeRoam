'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface SavePopoverProps {
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
}

export function SavePopover({
  shopId,
  open,
  onOpenChange,
  trigger,
}: SavePopoverProps) {
  const { lists, isInList, saveShop, removeShop, createList } = useUserLists();
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [creating, setCreating] = useState(false);
  const [localOverrides, setLocalOverrides] = useState<Map<string, boolean>>(
    () => new Map()
  );

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setShowNewListInput(false);
      setNewListName('');
    }
    onOpenChange(nextOpen);
  }

  function getIsChecked(listId: string): boolean {
    if (localOverrides.has(listId)) {
      return localOverrides.get(listId) ?? false;
    }
    return isInList(listId, shopId);
  }

  async function handleToggle(listId: string) {
    const wasInList = isInList(listId, shopId);
    const optimistic = !wasInList;

    setLocalOverrides((prev) => new Map(prev).set(listId, optimistic));

    try {
      if (wasInList) {
        await removeShop(listId, shopId);
      } else {
        await saveShop(listId, shopId);
      }
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        next.delete(listId);
        return next;
      });
    } catch {
      setLocalOverrides((prev) => new Map(prev).set(listId, wasInList));
      toast.error('Something went wrong');
    }
  }

  async function handleCreate() {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createList(newListName.trim());
      setNewListName('');
      setShowNewListInput(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create list';
      toast.error(
        msg.includes('Maximum') ? "You've reached the 3-list limit" : msg
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleClose}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 overflow-hidden rounded-2xl p-0 shadow-xl"
        align="start"
      >
        <div className="border-border-warm flex items-center justify-between border-b px-4 py-4">
          <h3 className="text-text-body text-sm font-semibold">Save to List</h3>
          <button
            onClick={() => handleClose(false)}
            className="text-text-meta hover:text-text-body text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="py-2">
          {lists.length === 0 && (
            <div className="flex flex-col items-center px-4 py-8 text-center">
              <p className="text-text-body text-sm font-medium">No lists yet</p>
              <p className="text-text-meta mt-1 text-xs">
                Create a list to start saving
              </p>
            </div>
          )}
          {lists.map((list) => (
            <label
              key={list.id}
              className="hover:bg-surface-section flex cursor-pointer items-center gap-3 px-4 py-3"
            >
              <div className="bg-surface-card h-10 w-10 flex-shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-text-body truncate text-sm font-medium">
                  {list.name}
                </p>
                <p className="text-text-meta text-xs">
                  {list.items.length} spots
                </p>
              </div>
              <input
                type="checkbox"
                aria-label={list.name}
                checked={getIsChecked(list.id)}
                onChange={() => handleToggle(list.id)}
                className="accent-brand h-5 w-5 rounded border-gray-300"
              />
            </label>
          ))}
          {lists.length < 3 && (
            <button
              onClick={() => setShowNewListInput(true)}
              className="text-text-secondary hover:bg-surface-section flex w-full items-center gap-2 px-4 py-3 text-sm"
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

        {showNewListInput && (
          <div className="border-border-warm border-t px-4 py-3">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="List name..."
              autoFocus
              className="bg-surface-section w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              disabled={creating}
            />
          </div>
        )}

        <div className="border-border-warm border-t px-4 py-3">
          <button
            onClick={() => handleClose(false)}
            className="bg-brand w-full rounded-full py-2.5 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
