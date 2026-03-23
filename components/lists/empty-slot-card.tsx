'use client';
import { CirclePlus } from 'lucide-react';

interface EmptySlotCardProps {
  remainingSlots: number;
  onClick: () => void;
}

export function EmptySlotCard({ remainingSlots, onClick }: EmptySlotCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex h-20 w-full flex-col items-center justify-center gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-[var(--border-medium,#E5E7EB)] bg-transparent transition-colors hover:bg-[var(--muted)]"
    >
      <CirclePlus className="h-6 w-6 text-[var(--text-tertiary)]" />
      <span className="text-[13px] font-medium text-[var(--text-tertiary)]">
        Create a new list
      </span>
      <span className="text-[11px] text-[var(--text-tertiary)]">
        {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
      </span>
    </button>
  );
}
