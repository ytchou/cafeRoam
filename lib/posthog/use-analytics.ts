'use client';

import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch';

export function useAnalytics() {
  const capture = useCallback(
    (event: string, properties: Record<string, unknown>) => {
      // NEXT_PUBLIC_POSTHOG_KEY acts as an "analytics enabled" gate.
      // If unset (e.g. local dev without PostHog), skip all tracking.
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;

      // Fire-and-forget: POST to backend analytics gateway (authenticated users only).
      // Unauthenticated visitors will receive a 401 — that is expected. The analytics
      // endpoint requires auth, so events on public pages are only tracked when the user
      // is signed in. Failures are always swallowed — analytics must never block UI.
      fetchWithAuth('/api/analytics/events', {
        method: 'POST',
        body: JSON.stringify({ event, properties }),
      }).catch((err: unknown) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[analytics] event dropped:', event, err);
        }
      });
    },
    []
  );

  return { capture };
}
