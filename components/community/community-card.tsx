'use client';

import { Coffee, Star } from 'lucide-react';
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
        <div className="bg-surface-avatar flex h-9 w-9 items-center justify-center rounded-full">
          <span className="text-map-pin text-sm font-bold">
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

      {note.starRating != null && (
        <div className="mt-2.5 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < note.starRating! ? 'fill-tarot-gold text-tarot-gold' : 'fill-gray-200 text-gray-200'}`}
            />
          ))}
        </div>
      )}

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-500">
        {note.reviewText}
      </p>

      <Link
        href={`/shops/${note.shopSlug}`}
        className="text-link-green mt-3 inline-flex items-center gap-1.5 text-xs font-medium"
      >
        <Coffee className="h-3.5 w-3.5" />
        {note.shopName}
        {note.shopLocation && ` · ${note.shopLocation}`}
      </Link>
    </div>
  );
}
