'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EmptySlotCard } from '@/components/lists/empty-slot-card';
import { useUserLists } from '@/lib/hooks/use-user-lists';

const MAX_LISTS = 3;

export function ListsTab() {
  const { lists, isLoading } = useUserLists();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[#6B6763]">No lists yet</p>
        <Link
          href="/lists"
          className="mt-2 block text-sm font-medium text-[#8B5E3C]"
        >
          Create your first list →
        </Link>
      </div>
    );
  }

  const remainingSlots = MAX_LISTS - lists.length;

  return (
    <div className="space-y-3 py-4">
      {lists.map((list) => (
        <Link
          key={list.id}
          href={`/lists/${list.id}`}
          className="block rounded-xl bg-white p-4 shadow-sm"
        >
          <p className="font-medium text-[#1A1918]">{list.name}</p>
          <p className="text-sm text-[#6B6763]">{list.items.length} shops</p>
        </Link>
      ))}

      {remainingSlots > 0 && (
        <EmptySlotCard
          remainingSlots={remainingSlots}
          onClick={() => router.push('/lists')}
        />
      )}

      <Link
        href="/lists"
        className="block pt-2 text-center text-sm font-medium text-[#8B5E3C]"
      >
        View all lists →
      </Link>
    </div>
  );
}
