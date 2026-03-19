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
      className={cn(
        'relative cursor-pointer bg-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-transform hover:scale-105',
        className
      )}
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={onClick}
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
            className="flex h-full w-full items-center justify-center bg-amber-50"
          >
            <span className="text-2xl">☕</span>
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
