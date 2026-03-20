import Image from 'next/image';
import { ChevronLeft, Bookmark, Share2, Images } from 'lucide-react';

interface ShopHeroProps {
  photoUrls: string[];
  shopName: string;
  isSaved?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export function ShopHero({
  photoUrls,
  shopName,
  isSaved = false,
  onBack,
  onSave,
  onShare,
}: ShopHeroProps) {
  const primary = photoUrls.at(0);

  return (
    <div className="relative h-[260px] w-full bg-gray-100">
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
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
          >
            <ChevronLeft className="h-5 w-5 text-[#1A1918]" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              aria-label="Save"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
            >
              <Bookmark
                className={`h-4 w-4 ${isSaved ? 'fill-amber-500 text-amber-500' : 'text-[#1A1918]'}`}
              />
            </button>
          )}
          {onShare && (
            <button
              onClick={onShare}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm"
            >
              <Share2 className="h-4 w-4 text-[#1A1918]" />
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
