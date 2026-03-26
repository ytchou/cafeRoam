'use client';

import { useEffect, useRef } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { useConsent } from '@/lib/consent/use-consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function GA4Provider() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent } = useConsent();
  const defaultSetRef = useRef(false);

  // Set consent defaults once (before GA script loads)
  useEffect(() => {
    if (!gaId || defaultSetRef.current) return;
    defaultSetRef.current = true;

    window.gtag?.('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }, [gaId]);

  // Update consent when user makes a choice
  useEffect(() => {
    if (!gaId || consent === 'pending') return;

    window.gtag?.('consent', 'update', {
      analytics_storage: consent,
    });
  }, [gaId, consent]);

  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
