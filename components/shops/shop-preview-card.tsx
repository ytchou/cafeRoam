'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronRight } from 'lucide-react';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import type { MappableLayoutShop } from '@/lib/types';

interface ShopPreviewCardProps {
  shop: MappableLayoutShop;
  onClose: () => void;
  onNavigate: () => void;
}

function formatMeta(shop: MappableLayoutShop): string {
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

export function ShopPreviewCard({
  shop,
  onClose,
  onNavigate,
}: ShopPreviewCardProps) {
  const { capture } = useAnalytics();
  const photos = shop.photo_urls ?? shop.photoUrls ?? [];
  const photoUrl = photos.at(0) ?? null;
  const tags = shop.taxonomyTags?.slice(0, 3) ?? [];

  useEffect(() => {
    capture('shop_preview_opened', { shop_id: shop.id, source: 'map_pin' });
  }, [shop.id, capture]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="w-[340px] overflow-hidden rounded-2xl bg-white/80 shadow-xl backdrop-blur-md transition-all duration-200">
      <div className="flex gap-3 p-3">
        {photoUrl ? (
          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg">
            <Image
              src={photoUrl}
              alt={shop.name}
              fill
              className="object-cover"
              sizes="60px"
            />
          </div>
        ) : (
          <div className="bg-muted text-text-tertiary flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-lg text-xs">
            No photo
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-1">
            <span className="text-foreground truncate font-[family-name:var(--font-body)] text-[15px] font-semibold">
              {shop.name}
            </span>
            <button
              type="button"
              aria-label="Close preview"
              onClick={onClose}
              className="text-text-tertiary hover:text-foreground -mr-1 shrink-0 p-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <span className="text-text-secondary font-[family-name:var(--font-body)] text-[13px]">
            {formatMeta(shop)}
          </span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="bg-muted text-text-secondary rounded-full px-2 py-0.5 font-[family-name:var(--font-body)] text-[11px]"
                >
                  {tag.labelZh}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-3 py-2">
        <button
          type="button"
          aria-label="View details"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--tag-active-bg)] py-2 font-[family-name:var(--font-body)] text-[14px] font-medium text-[var(--tag-active-text)] transition-opacity hover:opacity-90"
        >
          View Details
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
