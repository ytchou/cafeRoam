import Image from 'next/image';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import type { CheckInData } from '@/lib/hooks/use-user-checkins';
import { formatRelativeTime } from '@/lib/utils';

interface CheckinHistoryTabProps {
  checkins: CheckInData[];
  isLoading: boolean;
}

export function CheckinHistoryTab({
  checkins,
  isLoading,
}: CheckinHistoryTabProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12" data-testid="loading-spinner">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        <p>No check-ins yet — find a shop to visit</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {checkins.map((checkin) => (
        <CheckinCard key={checkin.id} checkin={checkin} />
      ))}
    </div>
  );
}

function CheckinCard({ checkin }: { checkin: CheckInData }) {
  const date = formatRelativeTime(checkin.created_at);

  return (
    <div className="flex gap-3.5 rounded-2xl border border-[#F3F4F6] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Thumbnail */}
      {checkin.shop_photo_url ? (
        <Image
          src={checkin.shop_photo_url}
          alt={checkin.shop_name ?? ''}
          width={72}
          height={72}
          className="h-[72px] w-[72px] flex-shrink-0 rounded-xl object-cover"
          sizes="72px"
        />
      ) : (
        <div
          data-testid="coffee-icon-fallback"
          className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-xl bg-[#F5EDE4]"
        >
          <Coffee className="h-6 w-6 text-[#8B5E3C]" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <Link
            href={`/shop/${checkin.shop_id}`}
            className="truncate text-[15px] font-bold text-[#1A1918] hover:underline"
          >
            {checkin.shop_name ?? 'Unknown Shop'}
          </Link>
          <span className="ml-2 flex-shrink-0 text-xs text-[#9CA3AF]">
            {date}
          </span>
        </div>
        {checkin.review_text && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-[1.4] text-[#9CA3AF]">
            {checkin.review_text}
          </p>
        )}
      </div>
    </div>
  );
}
