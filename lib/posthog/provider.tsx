'use client';

import { useEffect } from 'react';
import { useConsent } from '@/lib/consent/use-consent';

// Module-level flag prevents double-init across React Strict Mode and remounts
let posthogInitialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { consent } = useConsent();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key) return;

    if (consent === 'granted') {
      import('posthog-js').then(({ default: posthog }) => {
        if (!posthogInitialized) {
          posthog.init(key, {
            api_host: host || 'https://app.posthog.com',
            capture_pageview: true,
            capture_pageleave: true,
            respect_dnt: true,
            persistence: 'localStorage+cookie',
          });
          posthog.register({
            environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
          });
          posthogInitialized = true;
        } else {
          posthog.opt_in_capturing();
        }
      });
    } else if (consent === 'denied') {
      import('posthog-js').then(({ default: posthog }) => {
        if (posthogInitialized) {
          posthog.opt_out_capturing();
        }
      });
    }
  }, [consent]);

  return <>{children}</>;
}
