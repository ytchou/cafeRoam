'use client';

import { SWRConfig } from 'swr';

const SWR_CONFIG = { revalidateOnFocus: false };

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={SWR_CONFIG}>{children}</SWRConfig>;
}
