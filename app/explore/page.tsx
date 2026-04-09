'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CommunityCard } from '@/components/community/community-card';
import { DistrictPicker } from '@/components/explore/district-picker';
import { TarotEmptyState } from '@/components/tarot/tarot-empty-state';
import { TarotSpread } from '@/components/tarot/tarot-spread';
import { trackSignupCtaClick } from '@/lib/analytics/ga4-events';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { useCommunityPreview } from '@/lib/hooks/use-community-preview';
import { useDistricts } from '@/lib/hooks/use-districts';
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
  const { districts } = useDistricts();
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<string[]>([]);
  const gpsAvailable = !geoError && latitude != null;
  const isNearMeMode = gpsAvailable && selectedDistrictIds.length === 0;
  const gpsStatus: 'loading' | 'active' | 'denied' | 'district-selected' =
    geoLoading
      ? 'loading'
      : geoError || latitude == null
        ? 'denied'
        : selectedDistrictIds.length > 0
          ? 'district-selected'
          : 'active';
  const [firstDistrict] = districts;
  const activeDistrictIds = useMemo(
    () =>
      selectedDistrictIds.length > 0
        ? selectedDistrictIds
        : !gpsAvailable && firstDistrict
          ? [firstDistrict.id]
          : [],
    [selectedDistrictIds, gpsAvailable, firstDistrict]
  );
  const effectiveLat = isNearMeMode ? latitude : null;
  const effectiveLng = isNearMeMode ? longitude : null;
  const effectiveDistrictIds = useMemo(
    () =>
      isNearMeMode
        ? null
        : activeDistrictIds.length > 0
          ? activeDistrictIds
          : null,
    [isNearMeMode, activeDistrictIds]
  );
  const { cards, isLoading, error, redraw, radiusKm, setRadiusKm } =
    useTarotDraw(effectiveLat, effectiveLng, effectiveDistrictIds);
  const { vibes } = useVibes();
  const previewVibes = useMemo(() => vibes.slice(0, 6), [vibes]);
  const previewDistricts = useMemo(() => districts.slice(0, 6), [districts]);
  const { notes: communityNotes } = useCommunityPreview();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const effectiveDistrictKey = effectiveDistrictIds?.join(',') ?? null;
  useEffect(() => {
    if (
      cards.length > 0 &&
      ((latitude && longitude) ||
        (effectiveDistrictKey && effectiveDistrictKey.length > 0))
    ) {
      capture('tarot_draw_loaded', {
        card_count: cards.length,
      });
    }
  }, [cards.length, latitude, longitude, effectiveDistrictKey, capture]);

  const handleExpandRadius = useCallback(() => {
    capture('tarot_empty_state', {
      radius_km: 10,
    });
    setRadiusKm(10);
  }, [capture, setRadiusKm]);

  const handleClearDistricts = useCallback(() => {
    setSelectedDistrictIds([]);
  }, []);

  const handleToggleDistrict = useCallback(
    (districtId: string) => {
      setSelectedDistrictIds((prev) => {
        const next = prev.includes(districtId)
          ? prev.filter((id) => id !== districtId)
          : [...prev, districtId];
        if (next.length === 0 && !gpsAvailable) return prev;
        return next;
      });
    },
    [gpsAvailable]
  );

  const handleSelectNearMe = useCallback(() => {
    setSelectedDistrictIds([]);
  }, []);

  const tarotAndVibes = (
    <>
      {districts.length > 0 && (
        <DistrictPicker
          districts={districts}
          selectedDistrictIds={activeDistrictIds}
          gpsAvailable={gpsAvailable}
          isNearMeActive={isNearMeMode}
          gpsStatus={gpsStatus}
          radiusKm={radiusKm}
          onToggleDistrict={handleToggleDistrict}
          onSelectNearMe={handleSelectNearMe}
        />
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2
          className="text-text-primary text-lg font-bold"
          style={BRICOLAGE_STYLE_SM}
        >
          <span className="text-tarot-gold">✦</span> Your Daily Draw
        </h2>
        <button
          type="button"
          onClick={() => redraw()}
          className="text-link-green text-xs font-medium"
          aria-label="Refresh daily draw"
        >
          Refresh ↺
        </button>
      </div>

      {(geoLoading ||
        isLoading ||
        (effectiveLat == null &&
          !geoError &&
          (!effectiveDistrictIds || effectiveDistrictIds.length === 0))) && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-espresso/20 h-[140px] animate-pulse rounded-lg"
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
        cards.length === 0 &&
        (effectiveLat != null ||
          (effectiveDistrictIds && effectiveDistrictIds.length > 0)) && (
          <TarotEmptyState
            onExpandRadius={
              effectiveDistrictIds && effectiveDistrictIds.length > 0
                ? undefined
                : handleExpandRadius
            }
            onTryDifferentDistrict={
              effectiveDistrictIds && effectiveDistrictIds.length > 0
                ? handleClearDistricts
                : undefined
            }
          />
        )}

      {cards.length > 0 && (
        <div
          className={isDesktop ? 'lg:[&>div]:flex-row lg:[&>div]:gap-4' : ''}
        >
          <TarotSpread cards={cards} onDrawAgain={redraw} />
        </div>
      )}

      {previewVibes.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-text-primary text-lg font-bold"
              style={BRICOLAGE_STYLE_SM}
            >
              Browse by Vibe
            </h2>
            <Link
              href="/explore/vibes"
              className="text-link-green text-xs font-medium"
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
                <span className="text-text-primary text-[13px] leading-tight font-semibold">
                  {vibe.name}
                </span>
                {vibe.subtitle && (
                  <div className="flex flex-wrap gap-1">
                    {vibe.subtitle
                      .split(' · ')
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
      {previewDistricts.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2
              className="text-text-primary text-lg font-bold"
              style={BRICOLAGE_STYLE_SM}
            >
              Browse by District
            </h2>
            <Link
              href="/explore/districts"
              className="text-link-green text-xs font-medium"
            >
              See all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {previewDistricts.map((district) => (
              <Link
                key={district.slug}
                href={`/explore/districts/${district.slug}`}
                className="flex flex-col gap-1.5 rounded-2xl border border-gray-100 bg-white px-4 py-3"
              >
                <span className="text-text-primary text-[13px] leading-tight font-semibold">
                  {district.nameZh}
                </span>
                <span className="text-[11px] text-gray-400">
                  {district.nameEn}
                </span>
                <span className="mt-0.5 self-start rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                  {district.shopCount} shops
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
          ? 'bg-surface-section min-w-0 flex-1 rounded-2xl p-6'
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
          className="text-link-green text-xs font-medium"
        >
          See all →
        </Link>
      </div>
      <div
        className={
          isDesktop ? 'mt-4 flex flex-col gap-3' : 'flex flex-col gap-3'
        }
      >
        {communityNotes.map((note) => (
          <CommunityCard key={note.checkinId} note={note} />
        ))}
      </div>
    </section>
  );

  return (
    <main className="bg-surface-warm min-h-screen px-5 pt-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <h1
          className="text-text-primary text-[28px] font-bold"
          style={BRICOLAGE_STYLE}
        >
          探索
        </h1>
        <span
          aria-hidden="true"
          className="text-text-secondary rounded-full p-2"
        >
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

      <div className="bg-surface-warm border-b border-[#e5e7eb] px-5 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <p className="text-text-secondary text-sm">知道一間很棒的咖啡廳？</p>
          <Link
            href="/submit"
            className="bg-brand inline-flex shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white"
            onClick={() => trackSignupCtaClick('home_submit_cta')}
          >
            推薦咖啡廳
          </Link>
        </div>
      </div>
    </main>
  );
}
