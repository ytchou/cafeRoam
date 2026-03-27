'use client';

import { useEffect, useState } from 'react';

import { useConsent } from '@/lib/consent/use-consent';
import { Button } from '@/components/ui/button';

export function CookieConsentBanner() {
  const { consent, updateConsent } = useConsent();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (consent !== 'pending') return null;

  return (
    <div
      role="banner"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t p-4 backdrop-blur-sm sm:p-6"
    >
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <p className="text-muted-foreground text-center text-sm sm:text-left">
          We use cookies to analyze traffic and improve your experience.{' '}
          <a
            href="/privacy"
            className="text-primary underline underline-offset-4"
          >
            Privacy Policy
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConsent('denied')}
          >
            Reject
          </Button>
          <Button size="sm" onClick={() => updateConsent('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
