'use client';

import { Coffee } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { CommunityNoteCard } from '@/types/community';

import { LikeButton } from './like-button';
import { formatRelativeTime, getInitial } from './utils';

interface CommunityCardFullProps {
  note: CommunityNoteCard;
  liked: boolean;
  onLikeToggle: () => void;
}

export function CommunityCardFull({
  note,
  liked,
  onLikeToggle,
}: CommunityCardFullProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {note.coverPhotoUrl && (
        <div className="relative h-[120px] w-full">
          <Image
            src={note.coverPhotoUrl}
            alt={`Photo from ${note.shopName}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5EDE4]">
              <span className="text-xs font-bold text-[#8B5E3C]">
                {getInitial(note.author.displayName)}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-900">
              {note.author.displayName}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 p-4">
        <p className="text-sm leading-relaxed text-gray-600">
          {note.reviewText}
        </p>

        <div className="flex items-center justify-between">
          <Link
            href={`/shops/${note.shopSlug}`}
            className="inline-flex items-center gap-1 rounded-full bg-[#F5EDE4] px-2.5 py-1 text-[11px] font-semibold text-[#8B5E3C]"
          >
            <Coffee className="h-3 w-3" />
            {note.shopName}
            {note.shopDistrict && ` · ${note.shopDistrict}`}
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">
              {formatRelativeTime(note.createdAt)}
            </span>
            <LikeButton count={note.likeCount} liked={liked} onToggle={onLikeToggle} />
          </div>
        </div>
      </div>
    </div>
  );
}
