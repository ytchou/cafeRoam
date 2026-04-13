'use client';

import Image from 'next/image';
import { ChevronLeft, Bookmark, Share2 } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel';
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
  const hasPhotos = photoUrls.length > 0;
  const isMulti = photoUrls.length > 1;

  return (
    <div className={cn('relative h-[260px] w-full bg-gray-100', className)}>
      {hasPhotos ? (
        <Carousel opts={{ loop: false }} className="h-full w-full">
          <CarouselContent className="h-full">
            {photoUrls.map((url, idx) => (
              <CarouselItem key={url} className="relative h-full">
                <Image
                  src={url}
                  alt={shopName}
                  fill
                  className="object-cover"
                  priority={idx === 0}
                  sizes="100vw"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          {isMulti && (
            <>
              <CarouselPrevious className="absolute top-1/2 left-4 hidden -translate-y-1/2 lg:flex" />
              <CarouselNext className="absolute top-1/2 right-4 hidden -translate-y-1/2 lg:flex" />
            </>
          )}
        </Carousel>
      ) : (
        <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-300">
          {shopName.at(0) ?? ''}
        </div>
      )}

      {/* Overlay buttons — top row */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 flex items-center justify-between px-4 pt-12 pb-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
          >
            <ChevronLeft className="text-text-primary h-5 w-5" />
          </button>
        )}
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          {onSave && (
            <button
              type="button"
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
              type="button"
              onClick={onShare}
              aria-label="Share"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
            >
              <Share2 className="text-text-primary h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slide indicator (replaces the old "N photos" badge) */}
      {isMulti && (
        <div className="absolute bottom-3 left-4 rounded-full bg-white/90 shadow-sm backdrop-blur-sm px-3 py-1.5">
          <span className="text-xs font-medium text-gray-700">
            View all {photoUrls.length} photos
          </span>
        </div>
      )}
    </div>
  );
}
