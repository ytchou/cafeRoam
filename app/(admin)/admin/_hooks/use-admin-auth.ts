'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAdminAuth() {
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }, []);

  return { getToken };
}
