// components/onboarding/__tests__/preference-modal.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreferenceOnboardingModal } from "../preference-modal";

const mockSave = vi.fn();
const mockDismiss = vi.fn();

const mockUseHook = vi.hoisted(() => vi.fn());
vi.mock("@/lib/hooks/use-preference-onboarding", () => ({
  usePreferenceOnboarding: mockUseHook,
}));

vi.mock("@/lib/hooks/use-vibes", () => ({
  useVibes: () => ({
    vibes: [
      { slug: "study-cave", emoji: "📚", nameZh: "K書", subtitleZh: "好讀書" },
      { slug: "cat-cafe",   emoji: "🐱", nameZh: "貓貓",  subtitleZh: "有貓" },
    ],
    isLoading: false,
  }),
}));

describe("PreferenceOnboardingModal", () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockDismiss.mockReset();
    mockUseHook.mockReturnValue({
      shouldPrompt: true,
      save: mockSave,
      dismiss: mockDismiss,
      isLoading: false,
    });
  });

  it("shows step 1 on open", () => {
    render(<PreferenceOnboardingModal />);
    expect(screen.getByText(/what brings you here today/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /focus time/i })).toBeInTheDocument();
  });

  it("advances from step 1 → 2 → 3 on Next", async () => {
    const user = userEvent.setup();
    render(<PreferenceOnboardingModal />);

    await user.click(screen.getByRole("button", { name: /focus time/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/how do you like your coffee shops/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /study-cave|k書/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/anything else you're hoping to find/i)).toBeInTheDocument();
  });

  it("submits with correct payload", async () => {
    const user = userEvent.setup();
    render(<PreferenceOnboardingModal />);

    await user.click(screen.getByRole("button", { name: /focus time/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /study-cave|k書/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByRole("textbox"), "no chains please");
    await user.click(screen.getByRole("button", { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith({
        preferredModes: ["work"],
        preferredVibes: ["study-cave"],
        onboardingNote: "no chains please",
      }),
    );
  });

  it("skip button calls dismiss", async () => {
    const user = userEvent.setup();
    render(<PreferenceOnboardingModal />);
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(mockDismiss).toHaveBeenCalled();
  });

  it("returns null when shouldPrompt is false", () => {
    mockUseHook.mockReturnValue({
      shouldPrompt: false,
      save: mockSave,
      dismiss: mockDismiss,
      isLoading: false,
    });
    const { container } = render(<PreferenceOnboardingModal />);
    expect(container.firstChild).toBeNull();
  });

  it("anywhere submits with empty preferred_modes", async () => {
    const user = userEvent.setup();
    render(<PreferenceOnboardingModal />);

    await user.click(screen.getByRole("button", { name: /anywhere/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /finish/i }));

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ preferredModes: [] }),
      ),
    );
  });
});
