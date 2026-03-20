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

export function SavePopover({ shopId, open, onOpenChange, trigger }: SavePopoverProps) {
  const { lists, isInList, saveShop, removeShop, createList } = useUserLists();
  const [newListName, setNewListName] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [creating, setCreating] = useState(false);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      setShowNewListInput(false);
      setNewListName('');
    }
    onOpenChange(nextOpen);
  }

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
      setShowNewListInput(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create list';
      toast.error(msg.includes('Maximum') ? "You've reached the 3-list limit" : msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleClose}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-2xl overflow-hidden shadow-xl" align="start">
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E4E1]">
          <h3 className="text-sm font-semibold text-[#3B2F2A]">Save to List</h3>
          <button
            onClick={() => handleClose(false)}
            className="text-[#9E9893] hover:text-[#3B2F2A] text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="py-2">
          {lists.length === 0 && (
            <div className="flex flex-col items-center py-8 px-4 text-center">
              <p className="text-sm font-medium text-[#3B2F2A]">No lists yet</p>
              <p className="text-xs text-[#9E9893] mt-1">Create a list to start saving</p>
            </div>
          )}
          {lists.map((list) => (
            <label
              key={list.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#F5F4F2] cursor-pointer"
            >
              <div className="h-10 w-10 rounded-lg bg-[#E8E6E2] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#3B2F2A] truncate">{list.name}</p>
                <p className="text-xs text-[#9E9893]">{list.items.length} spots</p>
              </div>
              <input
                type="checkbox"
                aria-label={list.name}
                checked={isInList(list.id, shopId)}
                onChange={() => handleToggle(list.id)}
                className="h-5 w-5 rounded border-gray-300 accent-[#2D5A27]"
              />
            </label>
          ))}
          {lists.length < 3 && (
            <button
              onClick={() => setShowNewListInput(true)}
              className="flex items-center gap-2 px-4 py-3 w-full text-sm text-[#6B6560] hover:bg-[#F5F4F2]"
            >
              <Plus className="h-4 w-4" />
              Create new list
            </button>
          )}
          {lists.length === 3 && (
            <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 mx-4 mb-2 rounded-lg">
              You&apos;ve reached the 3-list limit
            </p>
          )}
        </div>

        {showNewListInput && (
          <div className="px-4 py-3 border-t border-[#E5E4E1]">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="List name..."
              autoFocus
              className="w-full rounded-lg bg-[#F5F4F2] px-3 py-2 text-sm focus:outline-none"
              disabled={creating}
            />
          </div>
        )}

        <div className="px-4 py-3 border-t border-[#E5E4E1]">
          <button
            onClick={() => handleClose(false)}
            className="w-full rounded-full bg-[#2D5A27] py-2.5 text-sm font-semibold text-white"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
