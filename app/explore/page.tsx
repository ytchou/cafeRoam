'use client';

import { useEffect, useCallback } from 'react';
import { useGeolocation } from '@/lib/hooks/use-geolocation';
import { useTarotDraw } from '@/lib/hooks/use-tarot-draw';
import { TarotSpread } from '@/components/tarot/tarot-spread';
import { TarotEmptyState } from '@/components/tarot/tarot-empty-state';
import { useAnalytics } from '@/lib/posthog/use-analytics';

export default function ExplorePage() {
  const { capture } = useAnalytics();
  const { latitude, longitude, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  const { cards, isLoading, error, redraw, setRadiusKm } = useTarotDraw(latitude, longitude);

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

  return (
    <main className="min-h-screen bg-[#FAF7F4] px-5 pb-24 pt-6">
      <div className="mb-4">
        <h1
          className="text-xl font-bold text-[#2C1810]"
          style={{ fontFamily: 'var(--font-bricolage), var(--font-geist-sans), sans-serif' }}
        >
          ✦ Your Tarot Draw
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Discover a cafe chosen by fate
        </p>
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

      {!isLoading && !error && !geoError && cards.length === 0 && latitude != null && (
        <TarotEmptyState onExpandRadius={handleExpandRadius} />
      )}

      {cards.length > 0 && (
        <TarotSpread cards={cards} onDrawAgain={redraw} />
      )}
    </main>
  );
}
