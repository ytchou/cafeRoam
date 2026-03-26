'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import type { FollowedShop } from '@/lib/types';

interface FollowingSectionProps {
  shops: FollowedShop[];
  isLoading: boolean;
}

export function FollowingSection({ shops, isLoading }: FollowingSectionProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Heart className="h-8 w-8 text-gray-300" />
        <p className="text-text-secondary text-sm">
          You&apos;re not following any shops yet.
        </p>
        <p className="text-text-secondary text-xs">
          Tap the heart icon on a shop page to follow it.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {shops.map((shop) => (
        <Link
          key={shop.id}
          href={`/shops/${shop.id}${shop.slug ? `/${shop.slug}` : ''}`}
          className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm font-semibold text-[#1A1918] truncate">
              {shop.name}
            </p>
            <p className="text-text-secondary text-xs truncate">{shop.address}</p>
            {shop.mrt && (
              <p className="text-text-secondary mt-0.5 text-xs">{shop.mrt}</p>
            )}
          </div>
          <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />
        </Link>
      ))}
    </div>
  );
}
