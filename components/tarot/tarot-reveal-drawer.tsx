'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import type { TarotCardData } from '@/types/tarot';

interface TarotRevealDrawerProps {
  card: TarotCardData | null;
  open: boolean;
  onClose: () => void;
  onDrawAgain: () => void;
  onShareTap?: () => void;
}

export function TarotRevealDrawer({
  card,
  open,
  onClose,
  onDrawAgain,
  onShareTap,
}: TarotRevealDrawerProps) {
  const { capture } = useAnalytics();

  if (!card) return null;

  const shopPath = `/shops/${card.shopId}/${card.slug ?? card.shopId}`;
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="h-[95vh] max-h-[95vh] overflow-y-auto rounded-t-[10px] border-0 bg-[#FAF7F4]">
        <DrawerTitle className="sr-only">Your Tarot Draw</DrawerTitle>

        <div className="flex items-center justify-center gap-2 py-3 text-sm text-[#C4922A]">
          <span>✦</span>
          <span>Your Draw · {today}</span>
          <span>✦</span>
        </div>

        <div className="relative aspect-[4/3] w-full bg-gray-100">
          {card.coverPhotoUrl ? (
            <Image
              src={card.coverPhotoUrl}
              alt={card.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-300">
              {card.name[0]}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 px-6 py-5">
          <h2
            className="text-center text-xl font-bold tracking-[0.15em] text-[#2C1810] uppercase"
            style={{
              fontFamily:
                'var(--font-bricolage), var(--font-geist-sans), sans-serif',
            }}
          >
            {card.tarotTitle}
          </h2>

          <p className="text-lg font-semibold text-gray-800">{card.name}</p>
          <p className="text-sm text-gray-500">
            {card.neighborhood}
            {card.isOpenNow && ' · Open Now'}
            {card.rating != null && ` · ★${card.rating}`}
          </p>

          <p className="mt-1 text-center text-sm text-gray-600 italic">
            &ldquo;{card.flavorText}&rdquo;
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-2 px-6 pt-2 pb-8">
          <div className="flex gap-3">
            {onShareTap && (
              <button
                type="button"
                onClick={onShareTap}
                className="flex-1 rounded-full border border-[#C4922A] py-3 text-sm font-medium text-[#C4922A] transition-colors hover:bg-[#C4922A]/10"
              >
                Share My Draw
              </button>
            )}
            <Link
              href={shopPath}
              onClick={() => capture('tarot_lets_go', { shop_id: card.shopId })}
              className="flex flex-1 items-center justify-center rounded-full bg-[#2C1810] py-3 text-sm font-medium text-white transition-colors hover:bg-[#3D2920]"
            >
              Let&apos;s Go
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              capture('tarot_draw_again', {});
              onDrawAgain();
            }}
            className="rounded-full py-2 text-sm text-gray-500 transition-colors hover:text-gray-700"
          >
            Draw Again
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
