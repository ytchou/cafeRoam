import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';
import type { CommunityNoteCard } from '@/types/community';

import { CommunityCard } from './community-card';

const defaultNote = makeCommunityNote() as unknown as CommunityNoteCard;

describe('CommunityCard', () => {
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
