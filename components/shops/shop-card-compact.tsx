'use client';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { VerifiedBadge } from './verified-badge';

interface CompactShop {
  id: string;
  name: string;
  rating: number | null;
  photo_urls?: string[];
  photoUrls?: string[];
  distance_m?: number | null;
  is_open?: boolean | null;
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
  community_summary?: string | null;
  communitySummary?: string | null;
  claimStatus?: string | null;
}

interface ShopCardCompactProps {
  shop: CompactShop;
  onClick: () => void;
  selected?: boolean;
}

function truncateSnippet(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return `「${text}」`;
  return `「${text.slice(0, maxLen)}…」`;
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
  const summary = shop.community_summary ?? shop.communitySummary ?? null;

  return (
    <article
      role="article"
      data-selected={selected || undefined}
      onClick={onClick}
      className={`flex min-h-[5rem] cursor-pointer items-center gap-3 px-5 py-2 transition-colors ${
        selected
          ? 'border-l-map-pin bg-card-selected border-l-[3px]'
          : 'bg-background'
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
        <div className="bg-muted text-text-tertiary flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] text-xs">
          No photo
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1">
          <span className="text-foreground truncate font-[family-name:var(--font-body)] text-[15px] font-semibold">
            {shop.name}
          </span>
          {shop.claimStatus === 'approved' && <VerifiedBadge size="sm" />}
        </div>
        <span className="text-text-secondary font-[family-name:var(--font-body)] text-[13px]">
          {formatMeta(shop)}
        </span>
        {summary && (
          <span className="text-text-tertiary font-[family-name:var(--font-body)] text-[12px]">
            {truncateSnippet(summary)}
          </span>
        )}
      </div>
      <ChevronRight
        data-testid="compact-card-arrow"
        className="text-text-tertiary h-[18px] w-[18px] shrink-0"
      />
    </article>
  );
}
