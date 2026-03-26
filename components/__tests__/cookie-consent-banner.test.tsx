import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentProvider } from '@/lib/consent/provider';
import { CookieConsentBanner } from '../cookie-consent-banner';

function renderBanner() {
  return render(
    <ConsentProvider>
      <CookieConsentBanner />
    </ConsentProvider>
  );
}

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    document.cookie = 'caferoam_consent=; max-age=0; path=/';
  });

  it('shows the consent banner when the visitor has not yet decided', () => {
    renderBanner();
    expect(
      screen.getByText(/we use cookies/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('hides the banner after the visitor clicks Accept', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /accept/i }));

    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('hides the banner after the visitor clicks Reject', async () => {
    const user = userEvent.setup();
    renderBanner();

    await user.click(screen.getByRole('button', { name: /reject/i }));

    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('does not show the banner when consent was previously granted', () => {
    document.cookie = 'caferoam_consent=granted; path=/';
    renderBanner();
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });

  it('does not show the banner when consent was previously denied', () => {
    document.cookie = 'caferoam_consent=denied; path=/';
    renderBanner();
    expect(screen.queryByText(/we use cookies/i)).not.toBeInTheDocument();
  });
});
