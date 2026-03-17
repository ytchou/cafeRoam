'use client';

interface TarotCardProps {
  title: string;
  isRevealed: boolean;
  onTap: () => void;
  index: number;
}

export function TarotCard({ title, isRevealed, onTap, index }: TarotCardProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`relative flex w-full items-center justify-center rounded-lg border-2 border-[#C4922A] bg-[#2C1810] px-6 py-0 transition-all duration-300 ${
        isRevealed ? 'opacity-60' : 'hover:border-[#D4A23A] hover:shadow-lg'
      }`}
      style={{
        height: 140,
        animationDelay: `${index * 150}ms`,
        boxShadow: isRevealed ? 'none' : '0 0 0 1px #C4922A inset',
      }}
    >
      <span
        className="font-bricolage flex items-center gap-3 text-lg font-bold tracking-[0.15em] text-[#C4922A]"
        style={{ fontFamily: 'var(--font-bricolage), var(--font-geist-sans), sans-serif' }}
      >
        <span aria-hidden="true">✦</span>
        <span className="uppercase">{title.toUpperCase()}</span>
        <span aria-hidden="true">✦</span>
      </span>

      {isRevealed && (
        <span className="absolute bottom-2 right-3 rounded-full bg-[#C4922A]/20 px-2 py-0.5 text-xs text-[#C4922A]">
          ✓ Revealed
        </span>
      )}
    </button>
  );
}
