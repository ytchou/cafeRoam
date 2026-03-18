import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';
import type { CommunityNoteCard } from '@/types/community';

import { CommunityCard } from './community-card';

// IntersectionObserver is a browser boundary — mock at the API level
function mockIntersectionObserver(triggerImmediately = false) {
  const observe = vi.fn();
  const disconnect = vi.fn();
  const MockObserver = vi.fn((callback: IntersectionObserverCallback) => {
    if (triggerImmediately) {
      callback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver
      );
    }
    return { observe, disconnect };
  });
  vi.stubGlobal('IntersectionObserver', MockObserver);
  return { MockObserver, observe, disconnect };
}

const defaultNote = makeCommunityNote() as unknown as CommunityNoteCard;

describe('CommunityCard', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    // Default no-op stub so tests that don't care about viewport behaviour still work
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
    );
  });

  it('fires community_note_viewed analytics when the card enters the viewport', () => {
    const { MockObserver, observe } = mockIntersectionObserver(true);
    render(<CommunityCard note={defaultNote} />);
    expect(MockObserver).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledOnce();
  });

  it('does not fire community_note_viewed when card has not entered the viewport', () => {
    const { MockObserver } = mockIntersectionObserver(false);
    render(<CommunityCard note={defaultNote} />);
    expect(MockObserver).toHaveBeenCalledOnce();
  });
  it('displays the author name and role', () => {
    render(<CommunityCard note={defaultNote} />);

    expect(screen.getByText('Mei-Ling ☕')).toBeInTheDocument();
    expect(screen.getByText(/Coffee blogger/)).toBeInTheDocument();
  });

  it('displays the review text', () => {
    render(<CommunityCard note={defaultNote} />);

    expect(
      screen.getByText(/most incredible natural light/)
    ).toBeInTheDocument();
  });

  it('displays the shop name and district', () => {
    render(<CommunityCard note={defaultNote} />);

    expect(screen.getByText(/Hinoki Coffee/)).toBeInTheDocument();
    expect(screen.getByText(/大安/)).toBeInTheDocument();
  });

  it('shows the author avatar initial when no avatar url', () => {
    render(<CommunityCard note={defaultNote} />);

    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
