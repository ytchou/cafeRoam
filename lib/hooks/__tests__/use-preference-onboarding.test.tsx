// lib/hooks/__tests__/use-preference-onboarding.test.tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';
import React from 'react';

const mockFetchWithAuth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/fetch', () => ({
  fetchWithAuth: mockFetchWithAuth,
}));

import { usePreferenceOnboarding } from '../use-preference-onboarding';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children
  );
}

describe('usePreferenceOnboarding', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
  });

  it('fetches status on mount', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      shouldPrompt: true,
      preferredModes: null,
      preferredVibes: null,
      onboardingNote: null,
    });

    const { result } = renderHook(() => usePreferenceOnboarding(), { wrapper });

    await waitFor(() => expect(result.current.shouldPrompt).toBe(true));
  });

  it('save calls POST and revalidates status', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        shouldPrompt: true,
        preferredModes: null,
        preferredVibes: null,
        onboardingNote: null,
      })
      .mockResolvedValueOnce({
        shouldPrompt: false,
        preferredModes: ['work'],
        preferredVibes: null,
        onboardingNote: null,
      })
      .mockResolvedValueOnce({
        shouldPrompt: false,
        preferredModes: ['work'],
        preferredVibes: null,
        onboardingNote: null,
      });

    const { result } = renderHook(() => usePreferenceOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.shouldPrompt).toBe(true));

    await act(async () => {
      await result.current.save({ preferredModes: ['work'] });
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/profile/preferences',
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() => expect(result.current.shouldPrompt).toBe(false));
  });

  it('dismiss calls dismiss endpoint and revalidates', async () => {
    mockFetchWithAuth
      .mockResolvedValueOnce({
        shouldPrompt: true,
        preferredModes: null,
        preferredVibes: null,
        onboardingNote: null,
      })
      .mockResolvedValueOnce({
        shouldPrompt: false,
        preferredModes: null,
        preferredVibes: null,
        onboardingNote: null,
      })
      .mockResolvedValueOnce({
        shouldPrompt: false,
        preferredModes: null,
        preferredVibes: null,
        onboardingNote: null,
      });

    const { result } = renderHook(() => usePreferenceOnboarding(), { wrapper });
    await waitFor(() => expect(result.current.shouldPrompt).toBe(true));

    await act(async () => {
      await result.current.dismiss();
    });

    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/profile/preferences/dismiss',
      expect.objectContaining({ method: 'POST' })
    );
    await waitFor(() => expect(result.current.shouldPrompt).toBe(false));
  });
});
