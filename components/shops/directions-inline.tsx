'use client';

import { useEffect, useMemo, useState } from 'react';
import { nearestMrtStation } from '@/lib/utils/mrt';

interface DirectionsInlineShop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface DirectionsInlineProps {
  shop: DirectionsInlineShop;
}

export function DirectionsInline({ shop }: DirectionsInlineProps) {
  const [mrtWalkMin, setMrtWalkMin] = useState<number | null>(null);

  const mrtStation = useMemo(
    () => nearestMrtStation(shop.latitude, shop.longitude),
    [shop.latitude, shop.longitude]
  );

  useEffect(() => {
    const ac = new AbortController();
    const params = new URLSearchParams({
      origin_lat: String(mrtStation.lat),
      origin_lng: String(mrtStation.lng),
      dest_lat: String(shop.latitude),
      dest_lng: String(shop.longitude),
      profile: 'walking',
    });
    fetch(`/api/maps/directions?${params}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setMrtWalkMin(d.durationMin);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [mrtStation.lat, mrtStation.lng, shop.latitude, shop.longitude]);

  const distanceLabel =
    mrtStation.dist < 1
      ? `${Math.round(mrtStation.dist * 1000)}m`
      : `${mrtStation.dist.toFixed(1)}km`;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;

  return (
    <div className="border-border-warm border-t px-5 py-3">
      <div className="flex items-center gap-3">
        <span className="bg-surface-section flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
          <TrainIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-text-primary text-sm">
            {mrtStation.name_en}
            <span className="text-text-meta"> ({mrtStation.name_zh})</span>
          </p>
          <p className="text-text-meta text-xs">{mrtStation.line}</p>
        </div>
        <span className="text-text-primary text-sm font-medium">
          {mrtWalkMin ? `~${mrtWalkMin} min walk` : distanceLabel}
        </span>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border-warm text-text-body hover:bg-surface-section ml-2 rounded-full border px-3 py-1.5 text-xs"
        >
          Directions
        </a>
      </div>
    </div>
  );
}

function TrainIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="16" rx="2" />
      <path d="M4 11h16" />
      <path d="M12 3v8" />
      <path d="m8 19-2 3" />
      <path d="m18 22-2-3" />
      <circle cx="8" cy="15" r="1" />
      <circle cx="16" cy="15" r="1" />
    </svg>
  );
}
