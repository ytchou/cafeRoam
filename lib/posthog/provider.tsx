'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) return;

    posthog.init(key, {
      api_host: host || 'https://app.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      respect_dnt: true,
      persistence: 'localStorage+cookie',
    });
  }, []);

  return <>{children}</>;
}
