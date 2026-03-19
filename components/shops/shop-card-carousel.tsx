'use client';
import Image from 'next/image';
import { Star } from 'lucide-react';

interface CarouselShop {
  id: string;
  name: string;
  rating: number | null;
  review_count?: number;
  reviewCount?: number;
  photo_urls?: string[];
  photoUrls?: string[];
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
  distance_km?: number | null;
}

interface ShopCardCarouselProps {
  shop: CarouselShop;
  onClick: () => void;
  distanceText?: string;
}

export function ShopCardCarousel({ shop, onClick, distanceText }: ShopCardCarouselProps) {
  const photos = shop.photo_urls ?? shop.photoUrls ?? [];
  const reviewCount = shop.review_count ?? shop.reviewCount ?? 0;
  const photoUrl = photos.at(0) ?? null;

  return (
    <article
      role="article"
      onClick={onClick}
      className="flex flex-col w-[260px] shrink-0 rounded-2xl bg-white shadow-[0_4px_16px_#0000000F] overflow-hidden cursor-pointer"
    >
      {photoUrl ? (
        <div className="relative h-20 w-full">
          <Image
            src={photoUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="260px"
          />
        </div>
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-[var(--background)] text-[var(--text-tertiary)]">
          No photo
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-[12px_14px]">
        <div className="flex items-center justify-between">
          <span className="font-[family-name:var(--font-heading)] text-[15px] font-bold text-[var(--foreground)] truncate">
            {shop.name}
          </span>
          {distanceText && (
            <span className="text-xs font-medium text-[var(--text-tertiary)] shrink-0 ml-2">
              {distanceText}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Star className="h-[13px] w-[13px] fill-[var(--rating-star)] text-[var(--rating-star)]" />
          <span className="text-xs font-semibold text-[var(--foreground)]">
            {shop.rating?.toFixed(1) ?? '—'}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">({reviewCount})</span>
        </div>
        {shop.taxonomyTags && shop.taxonomyTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {shop.taxonomyTags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="rounded-lg bg-[var(--background)] px-2 py-[3px] text-[11px] font-medium text-[var(--muted-foreground)]"
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
