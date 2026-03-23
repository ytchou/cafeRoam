'use client';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface CompactShop {
  id: string;
  name: string;
  rating: number | null;
  photo_urls?: string[];
  photoUrls?: string[];
  distance_m?: number | null;
  is_open?: boolean | null;
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
}

interface ShopCardCompactProps {
  shop: CompactShop;
  onClick: () => void;
  selected?: boolean;
}

function formatMeta(shop: CompactShop): string {
  const parts: string[] = [];
  if (shop.rating != null) parts.push(`★ ${shop.rating.toFixed(1)}`);
  if (shop.distance_m != null) {
    parts.push(
      shop.distance_m < 1000
        ? `${shop.distance_m}m`
        : `${(shop.distance_m / 1000).toFixed(1)} km`
    );
  }
  if (shop.is_open != null) parts.push(shop.is_open ? 'Open' : 'Closed');
  return parts.join('  ·  ');
}

export function ShopCardCompact({
  shop,
  onClick,
  selected = false,
}: ShopCardCompactProps) {
  const photos = shop.photo_urls ?? shop.photoUrls ?? [];
  const photoUrl = photos.at(0) ?? null;

  return (
    <article
      role="article"
      data-selected={selected || undefined}
      onClick={onClick}
      className={`flex h-20 cursor-pointer items-center gap-3 px-5 py-0 transition-colors ${
        selected
          ? 'border-l-[3px] border-l-[var(--map-pin)] bg-[var(--card-selected-bg)]'
          : 'bg-[var(--background)]'
      }`}
    >
      {photoUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[10px]">
          <Image
            src={photoUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] bg-[var(--muted)] text-xs text-[var(--text-tertiary)]">
          No photo
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-[family-name:var(--font-body)] text-[15px] font-semibold text-[var(--foreground)]">
          {shop.name}
        </span>
        <span className="font-[family-name:var(--font-body)] text-[13px] text-text-secondary">
          {formatMeta(shop)}
        </span>
      </div>
      <ChevronRight
        data-testid="compact-card-arrow"
        className="h-[18px] w-[18px] shrink-0 text-[var(--border-light)]"
      />
    </article>
  );
}
