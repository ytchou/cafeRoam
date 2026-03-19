import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PolaroidCard } from './polaroid-card';

describe('PolaroidCard', () => {
  const defaultProps = {
    photoUrl: 'https://example.supabase.co/storage/v1/object/public/photo.jpg',
    shopName: 'Fika Coffee',
    district: '大安',
    earnedAt: '2026-02-15T10:00:00.000Z',
  };

  it('renders the shop name and district with month', () => {
    render(<PolaroidCard {...defaultProps} />);
    expect(screen.getByText('Fika Coffee')).toBeInTheDocument();
    expect(screen.getByText(/大安/)).toBeInTheDocument();
    expect(screen.getByText(/Feb/)).toBeInTheDocument();
  });

  it('renders the check-in photo', () => {
    render(<PolaroidCard {...defaultProps} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Fika Coffee');
  });

  it('renders fallback when no photo_url', () => {
    render(<PolaroidCard {...defaultProps} photoUrl={null} />);
    expect(screen.getByTestId('polaroid-no-photo')).toBeInTheDocument();
  });

  it('applies rotation style when rotation prop is provided', () => {
    const { container } = render(<PolaroidCard {...defaultProps} rotation={5} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.transform).toContain('rotate(5deg)');
  });

  it('renders push pin with the given color', () => {
    render(<PolaroidCard {...defaultProps} pinColor="#E05252" />);
    expect(screen.getByTestId('push-pin')).toBeInTheDocument();
  });

  it('does not render push pin when showPin is false', () => {
    render(<PolaroidCard {...defaultProps} showPin={false} />);
    expect(screen.queryByTestId('push-pin')).not.toBeInTheDocument();
  });
});
