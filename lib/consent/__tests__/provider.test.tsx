import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentProvider } from '../provider';
import { useConsent } from '../use-consent';

function TestConsumer() {
  const { consent, updateConsent } = useConsent();
  return (
    <div>
      <span data-testid="consent-state">{consent}</span>
      <button onClick={() => updateConsent('granted')}>Accept</button>
      <button onClick={() => updateConsent('denied')}>Reject</button>
    </div>
  );
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

describe('ConsentProvider', () => {
  beforeEach(() => {
    document.cookie = 'caferoam_consent=; max-age=0; path=/';
  });

  it('shows pending state when no consent cookie exists', () => {
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );
    expect(screen.getByTestId('consent-state')).toHaveTextContent('pending');
  });

  it('reads granted state from existing cookie on mount', () => {
    document.cookie = 'caferoam_consent=granted; path=/';
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );
    expect(screen.getByTestId('consent-state')).toHaveTextContent('granted');
  });

  it('reads denied state from existing cookie on mount', () => {
    document.cookie = 'caferoam_consent=denied; path=/';
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );
    expect(screen.getByTestId('consent-state')).toHaveTextContent('denied');
  });

  it('treats a corrupted cookie value as pending', () => {
    document.cookie = 'caferoam_consent=garbage; path=/';
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );
    expect(screen.getByTestId('consent-state')).toHaveTextContent('pending');
  });

  it('when a visitor accepts cookies, the consent state updates to granted and a cookie is set', async () => {
    const user = userEvent.setup();
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );

    await user.click(screen.getByText('Accept'));

    expect(screen.getByTestId('consent-state')).toHaveTextContent('granted');
    expect(getCookie('caferoam_consent')).toBe('granted');
  });

  it('when a visitor rejects cookies, the consent state updates to denied and a cookie is set', async () => {
    const user = userEvent.setup();
    render(
      <ConsentProvider>
        <TestConsumer />
      </ConsentProvider>
    );

    await user.click(screen.getByText('Reject'));

    expect(screen.getByTestId('consent-state')).toHaveTextContent('denied');
    expect(getCookie('caferoam_consent')).toBe('denied');
  });
});
