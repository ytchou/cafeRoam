'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface ShopListItem {
  id: string;
  slug: string;
  name: string;
  rating: number | null;
  distance_m: number | null;
  is_open: boolean | null;
  photo_url: string | null;
}

interface MapListViewProps {
  shops: ShopListItem[];
}

function formatDistance(meters: number | null): string {
  if (meters == null) return '';
  return meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
}

export function MapListView({ shops }: MapListViewProps) {
  const router = useRouter();

  if (shops.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        No shops found nearby
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#E5E4E1]">
      {shops.map((shop) => (
        <button
          key={shop.id}
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
          style={{ minHeight: 80 }}
          onClick={() => router.push(`/shops/${shop.id}/${shop.slug}`)}
        >
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {shop.photo_url ? (
              <Image
                src={shop.photo_url}
                alt={shop.name}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[#E5E4E1]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-gray-900">
              {shop.name}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              {shop.rating != null && (
                <span>★ {shop.rating.toFixed(1)}</span>
              )}
              {shop.distance_m != null && (
                <span>{formatDistance(shop.distance_m)}</span>
              )}
              <span
                className={
                  shop.is_open ? 'text-green-600' : 'text-gray-400'
                }
              >
                {shop.is_open ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="flex-shrink-0 text-gray-300" />
        </button>
      ))}
    </div>
  );
}
