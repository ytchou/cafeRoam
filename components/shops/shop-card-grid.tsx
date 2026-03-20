'use client';
import Image from 'next/image';
import { Star, ChevronRight } from 'lucide-react';

interface GridShop {
  id: string;
  name: string;
  rating: number | null;
  review_count?: number;
  reviewCount?: number;
  photo_urls?: string[];
  photoUrls?: string[];
  distance_m?: number | null;
  is_open?: boolean | null;
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
}

interface ShopCardGridProps {
  shop: GridShop;
  onClick: () => void;
}

export function ShopCardGrid({ shop, onClick }: ShopCardGridProps) {
  const photos = shop.photo_urls ?? shop.photoUrls ?? [];
  const photoUrl = photos.at(0) ?? null;

  return (
    <article
      role="article"
      onClick={onClick}
      className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_#0000000A] transition-shadow hover:shadow-[0_4px_16px_#0000000F]"
    >
      {photoUrl ? (
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={photoUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--background)] text-[var(--text-tertiary)]">
          No photo
        </div>
      )}
      <div className="flex flex-col gap-1 p-3">
        <div className="flex items-center justify-between">
          <span className="truncate font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--foreground)]">
            {shop.name}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
          <Star className="h-3 w-3 fill-[var(--rating-star)] text-[var(--rating-star)]" />
          <span className="font-semibold text-[var(--foreground)]">
            {shop.rating?.toFixed(1) ?? '—'}
          </span>
          {shop.distance_m != null && (
            <>
              <span>·</span>
              <span>
                {shop.distance_m < 1000
                  ? `${shop.distance_m}m`
                  : `${(shop.distance_m / 1000).toFixed(1)} km`}
              </span>
            </>
          )}
          {shop.is_open != null && (
            <>
              <span>·</span>
              <span
                className={
                  shop.is_open
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--destructive)]'
                }
              >
                {shop.is_open ? 'Open' : 'Closed'}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
