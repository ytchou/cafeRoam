'use client';

import { useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/fetch';

export function useAnalytics() {
  const capture = useCallback(
    (event: string, properties: Record<string, unknown>) => {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (!key) return;

      // Fire-and-forget: POST to backend analytics gateway
      fetchWithAuth('/api/analytics/events', {
        method: 'POST',
        body: JSON.stringify({ event, properties }),
      }).catch(() => {
        // Silently swallow analytics failures — never block UI
      });
    },
    []
  );

  return { capture };
}
