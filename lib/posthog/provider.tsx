'use client';

import { useEffect } from 'react';
import { useConsent } from '@/lib/consent/use-consent';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key || consent !== 'granted') return;

    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host || 'https://app.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        respect_dnt: true,
        persistence: 'localStorage+cookie',
      });
    });
  }, [consent]);

  return <>{children}</>;
}
