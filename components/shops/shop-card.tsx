'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Shop } from '@/lib/types';
import { VerifiedBadge } from './verified-badge';

type ShopCardData = Pick<Shop, 'id' | 'name' | 'rating'> & {
  slug?: string;
  mrt?: string | null;
  photoUrls?: string[];
  photo_urls?: string[];
  claimStatus?: string | null;
};

interface ShopCardProps {
  shop: ShopCardData;
  searchQuery?: string;
}

export function ShopCard({ shop, searchQuery }: ShopCardProps) {
  const router = useRouter();

  function handleClick() {
    const base = `/shops/${shop.id}/${shop.slug ?? shop.id}`;
    const params = searchQuery
      ? `?ref=search&q=${encodeURIComponent(searchQuery)}`
      : '';
    router.push(`${base}${params}`);
  }

  const locationLabel = shop.mrt ?? '';
  const photoUrl = (shop.photo_urls ?? shop.photoUrls)?.[0];

  return (
    <article
      onClick={handleClick}
      className="cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl font-bold text-gray-300">
            {shop.name[0] ?? '?'}
          </div>
        )}
      </div>
      <div className="p-2">
        <h3 className="truncate text-sm font-semibold text-gray-900">
          {shop.name}
        </h3>
        <div className="mt-1 flex items-center gap-1">
          <span className="text-brand text-xs">★</span>
          <span className="text-xs text-gray-600">
            {shop.rating?.toFixed(1)}
          </span>
          {locationLabel && (
            <>
              <span className="text-xs text-gray-300">·</span>
              <span className="truncate text-xs text-gray-500">
                {locationLabel}
              </span>
            </>
          )}
          {shop.claimStatus === 'approved' && <VerifiedBadge size="sm" />}
        </div>
      </div>
    </article>
  );
}
