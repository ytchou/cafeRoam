'use client';
import Image from 'next/image';

export interface FavoritesShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  review_count: number;
  photo_urls: string[];
  taxonomy_tags?: { label_zh?: string; labelZh?: string }[];
  is_open?: boolean | null;
}

interface FavoritesShopRowProps {
  shop: FavoritesShop;
  onClick: () => void;
  selected?: boolean;
  distanceText?: string;
}

function extractDistrict(address: string): string {
  // Extract district from Taiwan address (e.g., "台北市大安區..." → "大安")
  const match = address.match(/([^市縣]{2,3})[區里鄉鎮]/);
  return match ? match[1] : '';
}

function formatMeta(shop: FavoritesShop): string {
  const parts: string[] = [];
  const district = extractDistrict(shop.address);
  if (district) parts.push(district);
  if (shop.is_open != null) parts.push(shop.is_open ? 'Open' : 'Closed');
  return parts.join(' · ');
}

export function FavoritesShopRow({
  shop,
  onClick,
  selected = false,
  distanceText,
}: FavoritesShopRowProps) {
  const photoUrl = shop.photo_urls.at(0) ?? null;

  return (
    <article
      role="article"
      data-selected={selected || undefined}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 px-5 py-[10px] transition-colors ${
        selected
          ? 'border-l-[3px] border-l-[var(--map-pin)] bg-[var(--card-selected-bg)]'
          : 'bg-white'
      }`}
    >
      {photoUrl ? (
        <div className="relative h-[52px] w-[52px] shrink-0 overflow-hidden rounded-xl">
          <Image
            src={photoUrl}
            alt={shop.name}
            fill
            className="object-cover"
            sizes="52px"
          />
        </div>
      ) : (
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] text-xs text-[var(--text-tertiary)]">
          No photo
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate font-[family-name:var(--font-body)] text-sm font-semibold text-[var(--foreground)]">
          {shop.name}
        </span>
        <span className="font-[family-name:var(--font-body)] text-xs text-[var(--text-secondary)]">
          {formatMeta(shop)}
        </span>
      </div>
      {distanceText && (
        <span className="shrink-0 text-xs text-[var(--text-tertiary)]">
          {distanceText}
        </span>
      )}
    </article>
  );
}
