import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FavoritesListCard } from './favorites-list-card';

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <img src={props.src as string} alt={props.alt as string} />
  ),
}));

const baseProps = {
  id: 'list-1',
  name: 'Work Spots',
  itemCount: 12,
  photoUrls: [
    'https://example.com/p1.jpg',
    'https://example.com/p2.jpg',
    'https://example.com/p3.jpg',
    'https://example.com/p4.jpg',
    'https://example.com/p5.jpg',
  ],
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onViewOnMap: vi.fn(),
};

describe('FavoritesListCard', () => {
  it('a user sees the list name and shop count', () => {
    render(<FavoritesListCard {...baseProps} />);
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
    expect(screen.getByText('12 shops')).toBeInTheDocument();
  });

  it('a user sees up to 4 photo thumbnails plus an overflow count', () => {
    render(<FavoritesListCard {...baseProps} />);
    const images = screen.getAllByRole('img');
    // 4 photo thumbnails max (not 5)
    expect(images).toHaveLength(4);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('a user tapping "View on map" triggers the callback', async () => {
    render(<FavoritesListCard {...baseProps} />);
    await userEvent.click(screen.getByText(/View on map/));
    expect(baseProps.onViewOnMap).toHaveBeenCalled();
  });

  it('a user sees the "Updated recently" indicator', () => {
    render(<FavoritesListCard {...baseProps} />);
    expect(screen.getByText(/Updated recently/)).toBeInTheDocument();
  });

  it('a user with no photos sees placeholder thumbnails', () => {
    render(<FavoritesListCard {...baseProps} photoUrls={[]} />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });
});
