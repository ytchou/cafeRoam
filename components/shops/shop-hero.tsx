import Image from 'next/image';
import { ChevronLeft, Bookmark, Share2, Images } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShopHeroProps {
  photoUrls: string[];
  shopName: string;
  isSaved?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  className?: string;
}

export function ShopHero({
  photoUrls,
  shopName,
  isSaved = false,
  onBack,
  onSave,
  onShare,
  className,
}: ShopHeroProps) {
  const primary = photoUrls.at(0);

  return (
    <div className={cn('relative h-[260px] w-full bg-gray-100', className)}>
      {primary ? (
        <Image
          src={primary}
          alt={shopName}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-300">
          {shopName.at(0) ?? ''}
        </div>
      )}

      {/* Overlay buttons — top row */}
      <div className="absolute top-0 right-0 left-0 flex items-center justify-between px-4 pt-12 pb-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
          >
            <ChevronLeft className="text-text-primary h-5 w-5" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              aria-label="Save"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-text-primary'}`}
              />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
            >
              <Share2 className="text-text-primary h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Photo count badge */}
      {photoUrls.length > 1 && (
        <div className="absolute bottom-3 left-4 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1">
          <Images className="h-3 w-3 text-white" />
          <span className="text-xs text-white">{photoUrls.length} photos</span>
        </div>
      )}
    </div>
  );
}
