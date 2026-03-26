'use client';

import { createContext, useState, useCallback, useMemo } from 'react';

export type ConsentState = 'granted' | 'denied' | 'pending';

export interface ConsentContextValue {
  consent: ConsentState;
  updateConsent: (value: 'granted' | 'denied') => void;
}

export const ConsentContext = createContext<ConsentContextValue | null>(null);

const COOKIE_NAME = 'caferoam_consent';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

function readConsentCookie(): ConsentState {
  if (typeof document === 'undefined') return 'pending';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`)
  );
  const value = match ? decodeURIComponent(match[1]) : null;
  if (value === 'granted' || value === 'denied') return value;
  return 'pending';
}

function writeConsentCookie(value: 'granted' | 'denied') {
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentState>(readConsentCookie);

  const updateConsent = useCallback((value: 'granted' | 'denied') => {
    writeConsentCookie(value);
    setConsent(value);
  }, []);

  const contextValue = useMemo(
    () => ({ consent, updateConsent }),
    [consent, updateConsent]
  );

  return (
    <ConsentContext.Provider value={contextValue}>
      {children}
    </ConsentContext.Provider>
  );
}
