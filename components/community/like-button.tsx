'use client';

import { Heart } from 'lucide-react';

interface LikeButtonProps {
  count: number;
  liked: boolean;
  onToggle: () => void;
}

export function LikeButton({ count, liked, onToggle }: LikeButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike this note' : 'Like this note'}
      className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-400"
    >
      <Heart
        className={`h-3.5 w-3.5 ${liked ? 'fill-red-400 text-red-400' : ''}`}
      />
      <span>{count}</span>
    </button>
  );
}
