'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useVibeShops } from '@/lib/hooks/use-vibe-shops';

export default function VibePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { latitude, longitude, requestLocation } = useGeolocation();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const { response, isLoading, error } = useVibeShops(slug, latitude, longitude);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
        <div className="mb-4 h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-3 h-20 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </main>
    );
  }

  if (error || !response) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-500"
        >
          ← Back
        </button>
        <p className="text-sm text-gray-500">Couldn&apos;t load shops. Please try again.</p>
      </main>
    );
  }

  const { vibe, shops, totalCount } = response;

  return (
    <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 text-sm text-gray-500"
      >
        ← Back
      </button>

      <div className="mb-5">
        <div className="flex items-center gap-2">
          {vibe.emoji && <span className="text-2xl">{vibe.emoji}</span>}
          <div>
            <h1
              className="text-xl font-bold text-[#1A1918]"
              style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
            >
              {vibe.name}
            </h1>
            <p className="text-xs text-gray-400">{vibe.nameZh}</p>
          </div>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {totalCount} shop{totalCount !== 1 ? 's' : ''} found
        </p>
      </div>

      {shops.length === 0 ? (
        <div className="rounded-xl bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No shops found for this vibe.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shops.map((shop) => (
            <li key={shop.shopId}>
              <Link
                href={`/shops/${shop.slug ?? shop.shopId}`}
                className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                {shop.coverPhotoUrl ? (
                  <Image
                    src={shop.coverPhotoUrl}
                    alt={shop.name}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A1918]">
                    {shop.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                    {shop.rating != null && <span>{shop.rating}</span>}
                    {shop.distanceKm != null && (
                      <span>{shop.distanceKm} km</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
