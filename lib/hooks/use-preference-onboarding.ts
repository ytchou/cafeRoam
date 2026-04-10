'use client';
import useSWR from 'swr';
import { fetchWithAuth } from '@/lib/api/fetch';

const STATUS_KEY = '/api/profile/preferences/status';

export type PreferenceOnboardingStatus = {
  shouldPrompt: boolean;
  preferredModes: string[] | null;
  preferredVibes: string[] | null;
  onboardingNote: string | null;
};

export type PreferencePayload = {
  preferredModes?: string[];
  preferredVibes?: string[];
  onboardingNote?: string;
};

export function usePreferenceOnboarding() {
  const { data, error, isLoading, mutate } = useSWR<PreferenceOnboardingStatus>(
    STATUS_KEY,
    fetchWithAuth,
    { revalidateOnFocus: false },
  );

  async function save(payload: PreferencePayload) {
    await fetchWithAuth('/api/profile/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await mutate();
  }

  async function dismiss() {
    await fetchWithAuth('/api/profile/preferences/dismiss', {
      method: 'POST',
    });
    await mutate();
  }

  return {
    shouldPrompt: data?.shouldPrompt ?? false,
    preferredModes: data?.preferredModes ?? null,
    preferredVibes: data?.preferredVibes ?? null,
    isLoading,
    error,
    save,
    dismiss,
  };
}
