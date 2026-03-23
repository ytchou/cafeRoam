'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import type { TarotCardData } from '@/types/tarot';

const BRICOLAGE_STYLE = {
  fontFamily: 'var(--font-bricolage), var(--font-geist-sans), sans-serif',
} as const;
const DIALOG_STYLE = { borderRadius: 24 } as const;

interface TarotRevealDrawerProps {
  card: TarotCardData | null;
  open: boolean;
  onClose: () => void;
  onDrawAgain: () => void;
  onShareTap?: () => void;
}

function TarotRevealContent({
  card,
  onClose,
  onDrawAgain,
  onShareTap,
}: Omit<TarotRevealDrawerProps, 'open'>) {
  const { capture } = useAnalytics();
  if (!card) return null;

  const shopPath = `/shops/${card.slug ?? card.shopId}`;

  return (
    <div className="flex flex-col items-center px-4 pb-6">
      {/* Header row: label + close */}
      <div className="flex w-full items-center justify-between pt-3 pb-1">
        <div className="text-tarot-gold flex items-center gap-1.5 text-xs font-semibold tracking-[1px]">
          <span>✦</span>
          <span>Tarot Card</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-full p-1 text-white/50 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tarot title */}
      <h2
        className="mt-3 text-center text-2xl font-bold tracking-wide text-white"
        style={BRICOLAGE_STYLE}
      >
        {card.tarotTitle}
      </h2>

      {/* Photo */}
      <div className="border-tarot-gold/40 relative mt-5 aspect-[3/4] w-56 overflow-hidden rounded-lg border-2">
        {card.coverPhotoUrl ? (
          <Image
            src={card.coverPhotoUrl}
            alt={card.name}
            fill
            className="object-cover"
            sizes="224px"
            priority
          />
        ) : (
          <div className="bg-tarot-surface text-tarot-gold/30 flex h-full items-center justify-center text-4xl font-bold">
            {card.name[0]}
          </div>
        )}
      </div>

      {/* Shop info */}
      <p className="mt-4 text-lg font-semibold text-white">{card.name}</p>
      <p className="text-tarot-gold mt-1 text-sm">
        {card.neighborhood}
        {card.isOpenNow && ' · Open Now'}
        {card.rating != null && ` · ★${card.rating}`}
      </p>

      {/* Flavor text */}
      <p className="text-tarot-text-dim mt-3 text-center text-sm italic">
        &ldquo;{card.flavorText}&rdquo;
      </p>

      {/* CTAs */}
      <div className="mt-6 flex w-full gap-3">
        {onShareTap && (
          <button
            type="button"
            onClick={onShareTap}
            className="border-tarot-gold text-tarot-gold hover:bg-tarot-gold/10 flex-1 rounded-full border py-3 text-sm font-medium transition-colors"
          >
            Share My Draw
          </button>
        )}
        <Link
          href={shopPath}
          onClick={() => capture('tarot_lets_go', { shop_id: card.shopId })}
          className="bg-tarot-gold text-tarot-bg hover:bg-tarot-gold/90 flex flex-1 items-center justify-center rounded-full py-3 text-sm font-medium transition-colors"
        >
          Let&apos;s Go →
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-4 flex w-full items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="text-tarot-btn hover:text-tarot-gold text-sm"
        >
          ← Back to cards
        </button>
        <button
          type="button"
          onClick={() => {
            capture('tarot_draw_again', {});
            onDrawAgain();
          }}
          className="text-tarot-btn hover:text-tarot-gold text-sm"
        >
          Draw Again ↺
        </button>
      </div>
    </div>
  );
}

export function TarotRevealDrawer({
  card,
  open,
  onClose,
  onDrawAgain,
  onShareTap,
}: TarotRevealDrawerProps) {
  const isDesktop = useIsDesktop();

  if (!card) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          className="border-tarot-border bg-tarot-surface max-w-[480px] p-0"
          style={DIALOG_STYLE}
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Tarot Card Reveal</DialogTitle>
          <TarotRevealContent
            card={card}
            onClose={onClose}
            onDrawAgain={onDrawAgain}
            onShareTap={onShareTap}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-tarot-bg h-[95vh] max-h-[95vh] overflow-y-auto rounded-t-[10px] border-0">
        <DrawerTitle className="sr-only">Tarot Card Reveal</DrawerTitle>
        <TarotRevealContent
          card={card}
          onClose={onClose}
          onDrawAgain={onDrawAgain}
          onShareTap={onShareTap}
        />
      </DrawerContent>
    </Drawer>
  );
}
