'use client';

import { useEffect, useRef } from 'react';
import { GoogleAnalytics } from '@next/third-parties/google';
import { useConsent } from '@/lib/consent/use-consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Ensures window.gtag and dataLayer are ready to queue commands before the GA4
// script loads. GA4 drains the dataLayer queue on init, so pre-queued consent
// commands are processed even if the script hasn't loaded yet.
function ensureGtagQueue() {
  window.dataLayer = window.dataLayer ?? [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      (window.dataLayer as unknown[]).push(arguments);
    };
  }
}

export function GA4Provider() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const { consent } = useConsent();
  const defaultSetRef = useRef(false);

  // Set consent defaults once — queued to dataLayer before GA4 script loads
  useEffect(() => {
    if (!gaId || defaultSetRef.current) return;
    defaultSetRef.current = true;

    ensureGtagQueue();
    window.gtag!('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }, [gaId]);

  // Update consent when user makes a choice
  useEffect(() => {
    if (!gaId || consent === 'pending') return;

    ensureGtagQueue();
    window.gtag!('consent', 'update', {
      analytics_storage: consent,
    });
  }, [gaId, consent]);

  if (!gaId) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
