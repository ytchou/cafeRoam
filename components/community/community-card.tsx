'use client';

import { Coffee } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { useAnalytics } from '@/lib/posthog/use-analytics';
import type { CommunityNoteCard } from '@/types/community';

import { formatRelativeTime, getInitial } from './utils';

interface CommunityCardProps {
  note: CommunityNoteCard;
}

export function CommunityCard({ note }: CommunityCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { capture } = useAnalytics();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let fired = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired) {
          fired = true;
          capture('community_note_viewed', { checkin_id: note.checkinId });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [note.checkinId, capture]);

  return (
    <div ref={ref} className="rounded-2xl border border-gray-100 bg-white p-4">
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
