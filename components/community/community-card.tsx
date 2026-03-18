'use client';

import { Coffee } from 'lucide-react';
import Link from 'next/link';

import type { CommunityNoteCard } from '@/types/community';

interface CommunityCardProps {
  note: CommunityNoteCard;
}

function getInitial(name: string): string {
  return name.replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase() || '?';
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1w ago';
  return `${weeks}w ago`;
}

export function CommunityCard({ note }: CommunityCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5EDE4]">
          <span className="text-sm font-bold text-[#8B5E3C]">
            {getInitial(note.author.displayName)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-gray-900">
            {note.author.displayName}
          </span>
          <span className="text-[11px] text-gray-400">
            {note.author.roleLabel} · {formatRelativeTime(note.createdAt)}
          </span>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-500">
        {note.reviewText}
      </p>

      <Link
        href={`/shops/${note.shopSlug}`}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#3D8A5A]"
      >
        <Coffee className="h-3.5 w-3.5" />
        {note.shopName}
        {note.shopDistrict && ` · ${note.shopDistrict}`}
      </Link>
    </div>
  );
}
