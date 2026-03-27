'use client';
import { useRef, useEffect } from 'react';
import { ShopCardCarousel } from '@/components/shops/shop-card-carousel';
import type { LayoutShop } from '@/lib/types';

interface ShopCarouselProps {
  shops: LayoutShop[];
  onShopClick: (shopId: string) => void;
  onCardClick?: (shopId: string) => void;
  selectedShopId?: string | null;
}

export function ShopCarousel({
  shops,
  onShopClick,
  onCardClick,
  selectedShopId,
}: ShopCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedShopId || !scrollRef.current) return;
    const card = scrollRef.current.querySelector<HTMLElement>(
      `[data-shop-id="${selectedShopId}"]`
    );
    card?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedShopId]);

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
        className="scrollbar-none flex gap-3 overflow-x-auto px-5 pb-2"
      >
        {shops.map((shop) => (
          <div key={shop.id} data-shop-id={shop.id}>
            <ShopCardCarousel
              shop={shop}
              onClick={() => (onCardClick ?? onShopClick)(shop.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
