'use client';

import { useEffect } from 'react';

const BRICOLAGE_STYLE = {
  fontFamily: 'var(--font-bricolage), sans-serif',
} as const;
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, MapPin, Bookmark } from 'lucide-react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useVibeShops } from '@/lib/hooks/use-vibe-shops';
import { useVibes } from '@/lib/hooks/use-vibes';
import { useIsDesktop } from '@/lib/hooks/use-media-query';

export default function VibePage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const isDesktop = useIsDesktop();
  const { vibes } = useVibes();
  const otherVibes = vibes.filter((v) => v.slug !== slug).slice(0, 6);

  const {
    latitude,
    longitude,
    loading: geoLoading,
    requestLocation,
  } = useGeolocation();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const { response, isLoading, error } = useVibeShops(
    slug,
    latitude,
    longitude,
    5,
    geoLoading
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
        <div className="mb-4 h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="mb-3 h-20 animate-pulse rounded-xl bg-gray-200"
          />
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
          aria-label="Go back"
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <p className="text-sm text-gray-500">
          Couldn&apos;t load shops. Please try again.
        </p>
      </main>
    );
  }

  const { vibe, shops, totalCount } = response;
  const subtitleChips = vibe.subtitle
    ? vibe.subtitle.split(' · ').filter(Boolean)
    : [];

  return (
    <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
      {/* Header row: back button + emoji + vibe name */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 text-gray-600" />
          </button>
          {vibe.emoji && <span className="text-2xl">{vibe.emoji}</span>}
          <div className="min-w-0">
            <h1
              className="text-xl font-bold text-[#1A1918]"
              style={BRICOLAGE_STYLE}
            >
              {vibe.name}
            </h1>
            <p className="text-xs text-gray-400">{vibe.nameZh}</p>
          </div>
        </div>

        {/* Subtitle chips */}
        {subtitleChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 pl-12">
            {subtitleChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs text-gray-500 shadow-sm"
              >
                {chip}
              </span>
            ))}
          </div>
        )}

        {/* Shop count badge */}
        <div className="mt-3 pl-12">
          <span className="inline-flex items-center rounded-full bg-[#3D8A5A] px-3 py-1 text-xs font-medium text-white">
            {totalCount} {totalCount === 1 ? 'shop' : 'shops'} nearby
          </span>
        </div>
      </div>

      {shops.length === 0 ? (
        <div className="rounded-xl bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No shops found for this vibe.</p>
        </div>
      ) : (
        <ul
          className={
            isDesktop
              ? 'grid grid-cols-3 gap-3'
              : 'flex flex-col gap-3'
          }
        >
          {shops.map((shop) => (
            <li key={shop.shopId}>
              <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
                <Link
                  href={`/shops/${shop.slug ?? shop.shopId}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {shop.coverPhotoUrl ? (
                    <Image
                      src={shop.coverPhotoUrl}
                      alt={shop.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A1918]">
                      {shop.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      {shop.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="h-3 w-3 fill-[#fcd34d] text-[#fcd34d]" />
                          {shop.rating}
                        </span>
                      )}
                      {shop.distanceKm != null && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {shop.distanceKm} km
                        </span>
                      )}
                    </div>
                    {shop.matchedTagLabels && shop.matchedTagLabels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {shop.matchedTagLabels.map((label: string) => (
                          <span
                            key={label}
                            className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] text-gray-400"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
                <span aria-hidden="true" className="shrink-0 p-1 text-[#6B7280]">
                  <Bookmark className="h-5 w-5" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isDesktop && otherVibes.length > 0 && (
        <section className="mt-10">
          <p className="mb-3 text-sm font-semibold text-[#1A1918]">
            Want to explore other vibes?
          </p>
          <div className="flex flex-wrap gap-2">
            {otherVibes.map((v) => (
              <Link
                key={v.slug}
                href={`/explore/vibes/${v.slug}`}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-[#1A1918] hover:bg-gray-50"
              >
                {v.emoji} {v.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
