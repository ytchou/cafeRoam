'use client';
import { useRef, useEffect } from 'react';
import { ShopCardCarousel } from '@/components/shops/shop-card-carousel';

interface CarouselShop {
  id: string;
  name: string;
  rating: number | null;
  photo_urls?: string[];
  photoUrls?: string[];
  taxonomyTags?: Array<{ id: string; label: string; labelZh: string }>;
  review_count?: number;
  reviewCount?: number;
}

interface ShopCarouselProps {
  shops: CarouselShop[];
  onShopClick: (shopId: string) => void;
  selectedShopId?: string | null;
}

export function ShopCarousel({ shops, onShopClick, selectedShopId }: ShopCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedShopId || !scrollRef.current) return;
    const idx = shops.findIndex((s) => s.id === selectedShopId);
    if (idx < 0) return;
    const card = scrollRef.current.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedShopId, shops]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-5">
        <span className="font-[family-name:var(--font-heading)] text-[17px] font-bold text-[var(--foreground)]">
          Nearby Coffee Shops
        </span>
        <span className="font-[family-name:var(--font-body)] text-[13px] font-medium text-[var(--text-tertiary)]">
          {shops.length} places
        </span>
      </div>
      <div
        ref={scrollRef}
        data-testid="carousel-scroll"
        className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none"
      >
        {shops.map((shop) => (
          <ShopCardCarousel
            key={shop.id}
            shop={shop}
            onClick={() => onShopClick(shop.id)}
          />
        ))}
      </div>
    </div>
  );
}
