import Link from 'next/link';
import { PolaroidCard } from './polaroid-card';
import type { StampData } from '@/lib/hooks/use-user-stamps';

const MAX_PREVIEW = 4;

interface PolaroidSectionProps {
  stamps: StampData[];
  onStampClick?: (stamp: StampData) => void;
}

export function PolaroidSection({
  stamps,
  onStampClick,
}: PolaroidSectionProps) {
  const previewStamps = stamps.slice(0, MAX_PREVIEW);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Memories</h2>
        {stamps.length > 0 && (
          <Link
            href="/profile/memories"
            className="text-primary text-sm hover:underline"
          >
            View All &rarr;
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
        <div className="grid grid-cols-2 gap-3">
          {previewStamps.map((stamp) => (
            <div key={stamp.id} data-testid="polaroid-preview-card">
              <PolaroidCard
                photoUrl={stamp.photo_url}
                shopName={stamp.shop_name ?? 'Unknown Shop'}
                district={stamp.district}
                earnedAt={stamp.earned_at}
                showPin={false}
                onClick={() => onStampClick?.(stamp)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
