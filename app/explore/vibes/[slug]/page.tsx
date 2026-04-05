'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, MapPin, Star } from 'lucide-react';

import {
  DistrictChips,
  type VibeFilter,
} from '@/components/explore/district-chips';
import { CollapsibleMapPanel } from '@/components/map/collapsible-map-panel';
import { useDistricts } from '@/lib/hooks/use-districts';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useVibeShops } from '@/lib/hooks/use-vibe-shops';
import { useVibes } from '@/lib/hooks/use-vibes';
import { toast } from 'sonner';

const BRICOLAGE_STYLE = {
  fontFamily: 'var(--font-bricolage), sans-serif',
} as const;

export default function VibePage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const isDesktop = useIsDesktop();
  const { vibes } = useVibes();
  const { districts } = useDistricts();
  const otherVibes = vibes.filter((v) => v.slug !== slug).slice(0, 6);
  const { latitude, longitude, requestLocation } = useGeolocation();

  const [activeFilter, setActiveFilter] = useState<VibeFilter>({ type: 'all' });
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const vibeShopsFilter = useMemo(() => {
    if (
      activeFilter.type === 'nearby' &&
      latitude != null &&
      longitude != null
    ) {
      return { lat: latitude, lng: longitude };
    }

    if (activeFilter.type === 'districts') {
      return { districtIds: activeFilter.districtIds };
    }

    return {};
  }, [activeFilter, latitude, longitude]);

  const { response, isLoading, error } = useVibeShops(slug, vibeShopsFilter);

  const subtitleChips = useMemo(
    () =>
      response?.vibe.subtitle
        ? response.vibe.subtitle.split(' · ').filter(Boolean)
        : [],
    [response]
  );

  const mapShops = useMemo(
    () =>
      (response?.shops ?? []).map((shop) => ({
        id: shop.shopId,
        name: shop.name,
        latitude: shop.latitude ?? null,
        longitude: shop.longitude ?? null,
      })),
    [response]
  );

  const handleFilterChange = useCallback(
    async (filter: VibeFilter) => {
      if (filter.type === 'nearby') {
        const coords = await requestLocation();
        if (!coords) {
          toast.error('無法取得位置，已切換回全部');
          setActiveFilter({ type: 'all' });
        } else {
          setActiveFilter({ type: 'nearby' });
        }
        return;
      }

      setActiveFilter(filter);
    },
    [requestLocation]
  );

  const handlePinClick = useCallback((shopId: string) => {
    setSelectedShopId(shopId);
    const el = cardRefs.current[shopId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  if (isLoading) {
    return (
      <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
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
      <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
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
  const badgeText =
    activeFilter.type === 'nearby'
      ? `${totalCount} ${totalCount === 1 ? 'shop' : 'shops'} nearby`
      : `${totalCount} ${totalCount === 1 ? 'shop' : 'shops'}`;

  return (
    <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
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
              className="text-text-primary text-xl font-bold"
              style={BRICOLAGE_STYLE}
            >
              {vibe.name}
            </h1>
            <p className="text-xs text-gray-400">{vibe.nameZh}</p>
          </div>
        </div>

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

        <div className="mt-3 pl-12">
          <span className="bg-link-green inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white">
            {badgeText}
          </span>
        </div>
      </div>

      <DistrictChips
        districts={districts}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />

      <CollapsibleMapPanel
        shops={mapShops}
        selectedShopId={selectedShopId}
        onPinClick={handlePinClick}
      />

      {shops.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          此區域尚無符合的咖啡廳
        </div>
      ) : (
        <ul
          className={
            isDesktop ? 'grid grid-cols-3 gap-3' : 'flex flex-col gap-3'
          }
        >
          {shops.map((shop) => (
            <li
              key={shop.shopId}
              ref={(el) => {
                cardRefs.current[shop.shopId] = el;
              }}
              onClick={() => setSelectedShopId(shop.shopId)}
            >
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
                    <p className="text-text-primary truncate text-sm font-semibold">
                      {shop.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      {shop.rating != null && (
                        <span className="flex items-center gap-0.5">
                          <Star className="fill-rating-star text-rating-star h-3 w-3" />
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
                    {shop.matchedTagLabels.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {shop.matchedTagLabels.map((label) => (
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
                <span
                  aria-hidden="true"
                  className="text-text-secondary shrink-0 p-1"
                >
                  <Bookmark className="h-5 w-5" />
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isDesktop && otherVibes.length > 0 && (
        <section className="mt-10">
          <p className="text-text-primary mb-3 text-sm font-semibold">
            Want to explore other vibes?
          </p>
          <div className="flex flex-wrap gap-2">
            {otherVibes.map((v) => (
              <Link
                key={v.slug}
                href={`/explore/vibes/${v.slug}`}
                className="text-text-primary rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm hover:bg-gray-50"
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
