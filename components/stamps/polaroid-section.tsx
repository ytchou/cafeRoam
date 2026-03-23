import Image from 'next/image';
import Link from 'next/link';
import { Images } from 'lucide-react';
import type { StampData } from '@/lib/hooks/use-user-stamps';

const MAX_PREVIEW = 3;

interface PolaroidSectionProps {
  stamps: StampData[];
  onStampClick?: (stamp: StampData) => void;
}

export function PolaroidSection({
  stamps,
  onStampClick,
}: PolaroidSectionProps) {
  const previewStamps = stamps.slice(0, MAX_PREVIEW);
  const visibleCount = Math.min(stamps.length, MAX_PREVIEW);

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 pt-7">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-heading text-xl font-bold text-[#1A1918]">
            My Memories
          </h2>
          {stamps.length > 0 && (
            <p className="text-[13px] text-[#9CA3AF]">
              {visibleCount} recent visits
            </p>
          )}
        </div>
        {stamps.length > 0 && (
          <Link
            href="/profile/memories"
            className="flex items-center gap-1 rounded-full bg-[#F5EDE4] px-3.5 py-1.5 text-xs font-semibold text-[#8B5E3C]"
          >
            <Images className="h-3.5 w-3.5" />
            View All
          </Link>
        )}
      </div>

      {stamps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-12 text-center">
          <p className="text-muted-foreground text-sm">
            Your memories will appear here after your first check-in
          </p>
        </div>
      ) : (
        <div
          data-testid="memory-scroll"
          className="flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-x-visible"
        >
          {previewStamps.map((stamp) => (
            <div
              key={stamp.id}
              data-testid="memory-card"
              role={onStampClick ? 'button' : undefined}
              tabIndex={onStampClick ? 0 : undefined}
              className="min-w-[200px] flex-shrink-0 cursor-pointer rounded-lg bg-white p-2.5 shadow-[0_3px_12px_rgba(0,0,0,0.08)] transition-transform hover:scale-[1.02] md:min-w-0"
              onClick={() => onStampClick?.(stamp)}
              onKeyDown={
                onStampClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStampClick(stamp);
                      }
                    }
                  : undefined
              }
            >
              <div className="relative h-[130px] w-full overflow-hidden rounded-sm">
                {stamp.photo_url ? (
                  <Image
                    src={stamp.photo_url}
                    alt={stamp.shop_name ?? 'Memory'}
                    fill
                    className="object-cover"
                    sizes="(min-width: 768px) 33vw, 200px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#F5EDE4] text-[#8B5E3C]">
                    <Images className="h-8 w-8" />
                  </div>
                )}
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#1A1918]">
                {stamp.shop_name ?? 'Unknown Shop'}
              </p>
              {stamp.diary_note && (
                <p className="truncate text-[11px] italic text-[#9CA3AF]">
                  &quot;{stamp.diary_note}&quot;
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
