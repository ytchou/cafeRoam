'use client';

interface TarotCardProps {
  title: string;
  isRevealed: boolean;
  onTap: () => void;
}

export function TarotCard({ title, isRevealed, onTap }: TarotCardProps) {
  return (
    <button
      type="button"
      data-testid="tarot-card"
      onClick={onTap}
      className={`border-tarot-gold bg-espresso relative flex w-full items-center justify-center rounded-lg border-2 px-6 py-0 transition-all duration-300 ${
        isRevealed
          ? 'opacity-60'
          : 'hover:border-tarot-gold-hover hover:shadow-lg'
      }`}
      style={{
        height: 140,
        boxShadow: isRevealed ? 'none' : '0 0 0 1px var(--tarot-gold) inset',
      }}
    >
      <span
        className="font-bricolage text-tarot-gold flex items-center gap-3 text-lg font-bold tracking-[0.15em]"
        style={{
          fontFamily:
            'var(--font-bricolage), var(--font-geist-sans), sans-serif',
        }}
      >
        <span aria-hidden="true">✦</span>
        <span className="uppercase">{title}</span>
        <span aria-hidden="true">✦</span>
      </span>

      {isRevealed && (
        <span className="bg-tarot-gold/20 text-tarot-gold absolute right-3 bottom-2 rounded-full px-2 py-0.5 text-xs">
          ✓ Revealed
        </span>
      )}
    </button>
  );
}
