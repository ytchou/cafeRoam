'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const PIN_COLORS = ['#E05252', '#5271E0', '#E0C452', '#52B052'] as const;

interface PolaroidCardProps {
  photoUrl: string | null;
  shopName: string;
  district: string | null;
  earnedAt: string;
  rotation?: number;
  pinColor?: string;
  showPin?: boolean;
  className?: string;
  onClick?: () => void;
}

function formatMonth(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export { PIN_COLORS };

export function PolaroidCard({
  photoUrl,
  shopName,
  district,
  earnedAt,
  rotation = 0,
  pinColor = PIN_COLORS[0],
  showPin = true,
  className,
  onClick,
}: PolaroidCardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'relative bg-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform hover:scale-105',
        onClick && 'cursor-pointer',
        className
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {showPin && (
        <div
          data-testid="push-pin"
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2"
        >
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
            <circle cx="8" cy="6" r="6" fill={pinColor} />
            <rect x="7" y="10" width="2" height="14" rx="1" fill="#888" />
          </svg>
        </div>
      )}

      <div className="relative aspect-square overflow-hidden">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={shopName}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          <div
            data-testid="polaroid-no-photo"
            className="flex h-full w-full items-center justify-center bg-amber-50 text-amber-300"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.5 3H6c-1.1 0-2 .9-2 2v5.71c0 3.83 2.95 7.18 6.78 7.29 3.96.12 7.22-3.06 7.22-7V5c0-1.1-.9-2-2-2zm-1 5H7V5h10.5v3zM20 16c0 .55-.45 1-1 1h-1.22c.44-.73.74-1.55.86-2.43C19.53 14.69 20 15.3 20 16zm-3 3H7l-1 3h12l-1-3z" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-2 py-2">
        <p className="truncate text-[13px] font-semibold text-gray-900">
          {shopName}
        </p>
        <p className="truncate text-[11px] text-gray-500">
          {district && `${district} · `}{formatMonth(earnedAt)}
        </p>
      </div>
    </div>
  );
}
