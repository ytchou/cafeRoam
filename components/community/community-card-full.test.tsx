import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeCommunityNote } from '@/lib/test-utils/factories';
import type { CommunityNoteCard } from '@/types/community';

import { CommunityCardFull } from './community-card-full';

const defaultNote = makeCommunityNote() as unknown as CommunityNoteCard;

describe('CommunityCardFull', () => {
  it('displays the cover photo when available', () => {
    render(
      <CommunityCardFull
        note={defaultNote}
        liked={false}
        onLikeToggle={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'alt',
      expect.stringContaining('Hinoki Coffee')
    );
  });

  it('displays the author badge', () => {
    render(
      <CommunityCardFull
        note={defaultNote}
        liked={false}
        onLikeToggle={vi.fn()}
      />
    );

    expect(screen.getByText('Mei-Ling ☕')).toBeInTheDocument();
  });

  it('displays the full review text', () => {
    render(
      <CommunityCardFull
        note={defaultNote}
        liked={false}
        onLikeToggle={vi.fn()}
      />
    );

    expect(
      screen.getByText(/The most incredible natural light/)
    ).toBeInTheDocument();
  });

  it('displays the shop tag with district', () => {
    render(
      <CommunityCardFull
        note={defaultNote}
        liked={false}
        onLikeToggle={vi.fn()}
      />
    );

    expect(screen.getByText(/Hinoki Coffee · 中山站/)).toBeInTheDocument();
  });

  it('displays the like count', () => {
    render(
      <CommunityCardFull
        note={defaultNote}
        liked={false}
        onLikeToggle={vi.fn()}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
