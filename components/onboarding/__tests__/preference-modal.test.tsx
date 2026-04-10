// components/onboarding/__tests__/preference-modal.test.tsx
//
// Mocking strategy: mock at HTTP boundaries, not internal hooks.
// - @/lib/api/fetch is the HTTP boundary for SWR fetchers (fetchPublic)
// - @/lib/hooks/use-preference-onboarding is mocked because it encapsulates
//   auth state + server mutations — its boundary is the API (mocked by the fetch mock)
//   but the hook is tested separately in use-preference-onboarding.test.tsx.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { PreferenceOnboardingModal } from '../preference-modal';

const mockSave = vi.fn();
const mockDismiss = vi.fn();

const mockUseHook = vi.hoisted(() => vi.fn());
vi.mock('@/lib/hooks/use-preference-onboarding', () => ({
  usePreferenceOnboarding: mockUseHook,
}));

// Mock at the HTTP boundary — fetchPublic is the SWR fetcher; stub it to return
// canned vibe data without a real network call.
const { mockFetchPublic } = vi.hoisted(() => ({
  mockFetchPublic: vi.fn(),
}));

vi.mock('@/lib/api/fetch', () => ({
  fetchPublic: mockFetchPublic,
}));

const STUB_VIBES = [
  { slug: 'study-cave', emoji: '📚', nameZh: 'K書', subtitleZh: '好讀書' },
  { slug: 'cat-cafe', emoji: '🐱', nameZh: '貓貓', subtitleZh: '有貓' },
];

// Wrap renders in SWRConfig so each test gets a fresh cache.
function renderModal() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <PreferenceOnboardingModal />
    </SWRConfig>
  );
}

describe('PreferenceOnboardingModal', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockDismiss.mockReset();
    mockFetchPublic.mockReset();
    mockFetchPublic.mockResolvedValue(STUB_VIBES);
    mockUseHook.mockReturnValue({
      shouldPrompt: true,
      save: mockSave,
      dismiss: mockDismiss,
      isLoading: false,
    });
  });

  it('shows step 1 on open', () => {
    renderModal();
    expect(screen.getByText(/what brings you here today/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /focus time/i })
    ).toBeInTheDocument();
  });

  it('advances from step 1 → 2 → 3 on Next', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /focus time/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(
      screen.getByText(/how do you like your coffee shops/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /study-cave|k書/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(
      screen.getByText(/anything else you're hoping to find/i)
    ).toBeInTheDocument();
  });

  it('submits with correct payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /focus time/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /study-cave|k書/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.type(screen.getByRole('textbox'), 'no chains please');
    await user.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        preferredModes: ['work'],
        preferredVibes: ['study-cave'],
        onboardingNote: 'no chains please',
      })
    );
  });

  it('skip button calls dismiss', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('returns null when shouldPrompt is false', () => {
    mockUseHook.mockReturnValue({
      shouldPrompt: false,
      save: mockSave,
      dismiss: mockDismiss,
      isLoading: false,
    });
    const { container } = renderModal();
    expect(container.firstChild).toBeNull();
  });

  it('anywhere submits with empty preferred_modes', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /anywhere/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ preferredModes: [] })
      )
    );
  });

  it('selecting Anywhere clears other mode selections', async () => {
    const user = userEvent.setup();
    renderModal();

    // Pick a real mode first, then pick Anywhere — should clear
    await user.click(screen.getByRole('button', { name: /focus time/i }));
    await user.click(screen.getByRole('button', { name: /anywhere/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ preferredModes: [] })
      )
    );
  });

  it('selecting a real mode after Anywhere clears Anywhere', async () => {
    const user = userEvent.setup();
    renderModal();

    // Pick Anywhere, then pick a real mode — Anywhere should be cleared
    await user.click(screen.getByRole('button', { name: /anywhere/i }));
    await user.click(screen.getByRole('button', { name: /focus time/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ preferredModes: ['work'] })
      )
    );
  });
});
