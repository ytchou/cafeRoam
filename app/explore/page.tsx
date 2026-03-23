'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useMemo } from 'react';

import { CommunityCard } from '@/components/community/community-card';
import { TarotEmptyState } from '@/components/tarot/tarot-empty-state';
import { TarotSpread } from '@/components/tarot/tarot-spread';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { useCommunityPreview } from '@/lib/hooks/use-community-preview';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useTarotDraw } from '@/lib/hooks/use-tarot-draw';
import { useVibes } from '@/lib/hooks/use-vibes';

const BRICOLAGE_STYLE = {
  fontFamily: 'var(--font-bricolage), var(--font-geist-sans), sans-serif',
} as const;
const BRICOLAGE_STYLE_SM = {
  fontFamily: 'var(--font-bricolage), sans-serif',
} as const;
const DM_SANS_STYLE = {
  fontFamily: 'var(--font-dm-sans), sans-serif',
} as const;

export default function ExplorePage() {
  const { capture } = useAnalytics();
  const isDesktop = useIsDesktop();
  const {
    latitude,
    longitude,
    error: geoError,
    loading: geoLoading,
    requestLocation,
  } = useGeolocation();
  const { cards, isLoading, error, redraw, setRadiusKm } = useTarotDraw(
    latitude,
    longitude
  );
  const { vibes } = useVibes();
  const previewVibes = useMemo(() => vibes.slice(0, 6), [vibes]);
  const { notes: communityNotes } = useCommunityPreview();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (cards.length > 0 && latitude && longitude) {
      capture('tarot_draw_loaded', {
        card_count: cards.length,
      });
    }
  }, [cards.length, latitude, longitude, capture]);

  const handleExpandRadius = useCallback(() => {
    capture('tarot_empty_state', {
      radius_km: 10,
    });
    setRadiusKm(10);
  }, [capture, setRadiusKm]);

  const tarotAndVibes = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-[11px] font-semibold tracking-[1px] text-[#C4922A]"
          style={DM_SANS_STYLE}
        >
          ✦ Your Daily Draw
        </span>
        <button
          type="button"
          onClick={() => redraw()}
          className="text-sm font-medium text-[#8B5E3C]"
          aria-label="Refresh daily draw"
        >
          Refresh ↺
        </button>
      </div>

      {geoError && (
        <div className="rounded-xl bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-gray-600">
            Enable location to discover nearby cafes.
          </p>
          <button
            type="button"
            onClick={requestLocation}
            className="mt-3 rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700"
          >
            Enable Location
          </button>
        </div>
      )}

      {(geoLoading || isLoading) && !geoError && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[140px] animate-pulse rounded-lg bg-[#2C1810]/20"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="rounded-xl bg-white/60 px-6 py-10 text-center">
          <p className="text-sm text-gray-600">
            Couldn&apos;t load your draw. Tap to retry.
          </p>
          <button
            type="button"
            onClick={() => redraw()}
            className="mt-3 rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading &&
        !error &&
        !geoError &&
        cards.length === 0 &&
        latitude != null && (
          <TarotEmptyState onExpandRadius={handleExpandRadius} />
        )}

      {cards.length > 0 && (
        <div
          className={
            isDesktop ? 'lg:[&>div]:flex-row lg:[&>div]:gap-4' : ''
          }
        >
          <TarotSpread cards={cards} onDrawAgain={redraw} />
        </div>
      )}

      {previewVibes.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-lg font-bold text-[#1A1918]"
              style={BRICOLAGE_STYLE_SM}
            >
              Browse by Vibe
            </h2>
            <Link
              href="/explore/vibes"
              className="text-xs font-medium text-[#3D8A5A]"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {previewVibes.map((vibe) => (
              <Link
                key={vibe.slug}
                href={`/explore/vibes/${vibe.slug}`}
                className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white px-4 py-3"
              >
                <span className="text-xl">{vibe.emoji}</span>
                <span className="text-[13px] leading-tight font-semibold text-[#1A1918]">
                  {vibe.name}
                </span>
                <span className="text-[11px] text-gray-400">
                  {vibe.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const communitySection = communityNotes.length > 0 && (
    <section
      className={
        isDesktop
          ? 'w-[400px] shrink-0 rounded-2xl bg-[#F5F4F1] p-6'
          : 'mt-8 flex flex-col gap-3'
      }
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-bold text-gray-900"
          style={BRICOLAGE_STYLE_SM}
        >
          From the Community
        </h2>
        <Link
          href="/explore/community"
          className="text-xs font-medium text-[#3D8A5A]"
        >
          See all →
        </Link>
      </div>
      <div className={isDesktop ? 'mt-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
        {communityNotes.map((note) => (
          <CommunityCard key={note.checkinId} note={note} />
        ))}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-[#FAF7F4] px-5 pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1
          className="text-[28px] font-bold text-[#1A1918]"
          style={BRICOLAGE_STYLE}
        >
          探索
        </h1>
        <span aria-hidden="true" className="rounded-full p-2 text-[#6B7280]">
          <Bell className="h-[22px] w-[22px]" />
        </span>
      </div>

      {isDesktop ? (
        <div className="flex gap-8">
          <div className="min-w-0 flex-1">{tarotAndVibes}</div>
          {communitySection}
        </div>
      ) : (
        <>
          {tarotAndVibes}
          {communitySection}
        </>
      )}
    </main>
  );
}
