'use client';

import { useState, useCallback } from 'react';
import { TarotCard } from './tarot-card';
import { TarotRevealDrawer } from './tarot-reveal-drawer';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { addRecentlySeenIds } from '@/lib/tarot/recently-seen';
import { shareCard } from '@/lib/tarot/share-card';
import type { TarotCardData } from '@/types/tarot';

interface TarotSpreadProps {
  cards: TarotCardData[];
  onDrawAgain: () => void;
}

export function TarotSpread({ cards, onDrawAgain }: TarotSpreadProps) {
  const { capture } = useAnalytics();
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [selectedCard, setSelectedCard] = useState<TarotCardData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleCardTap = useCallback(
    (card: TarotCardData, index: number) => {
      setRevealedIds((prev) => new Set(prev).add(card.shopId));
      setSelectedCard(card);
      setDrawerOpen(true);
      addRecentlySeenIds([card.shopId]);
      capture('tarot_card_tapped', {
        shop_id: card.shopId,
        tarot_title: card.tarotTitle,
        card_position: index + 1,
      });
    },
    [capture]
  );

  const handleDrawAgain = useCallback(() => {
    setRevealedIds(new Set());
    setSelectedCard(null);
    setDrawerOpen(false);
    onDrawAgain();
  }, [onDrawAgain]);

  const handleShare = useCallback(async () => {
    if (!selectedCard) return;
    try {
      const method = await shareCard(selectedCard);
      capture('tarot_share_tapped', {
        shop_id: selectedCard.shopId,
        share_method: method,
      });
    } catch {
      // Silent fail — share cancelled or unsupported
    }
  }, [selectedCard, capture]);

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card, i) => (
        <TarotCard
          key={card.shopId}
          title={card.tarotTitle}
          isRevealed={revealedIds.has(card.shopId)}
          onTap={() => handleCardTap(card, i)}
        />
      ))}

      <p className="mt-1 text-center text-sm text-gray-500">
        Tap a card to reveal your cafe
      </p>

      <TarotRevealDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onDrawAgain={handleDrawAgain}
        onShareTap={handleShare}
      />
    </div>
  );
}
