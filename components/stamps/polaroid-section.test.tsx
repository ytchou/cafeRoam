import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { makeStamp } from '@/lib/test-utils/factories';
import { PolaroidSection } from './polaroid-section';

describe('PolaroidSection', () => {
  it('renders "My Memories" heading', () => {
    render(<PolaroidSection stamps={[]} />);
    expect(screen.getByText('My Memories')).toBeInTheDocument();
  });

  it('renders empty state when no stamps', () => {
    render(<PolaroidSection stamps={[]} />);
    expect(
      screen.getByText(/Your memories will appear here/)
    ).toBeInTheDocument();
  });

  it('renders at most 3 memory cards', () => {
    const stamps = Array.from({ length: 6 }, (_, i) =>
      makeStamp({ id: `stamp-${i}`, shop_name: `Shop ${i}` })
    );
    render(<PolaroidSection stamps={stamps} />);
    const cards = screen.getAllByTestId('memory-card');
    expect(cards).toHaveLength(3);
  });

  it('renders shop name on each card', () => {
    const stamps = [makeStamp({ shop_name: 'Hinoki Coffee' })];
    render(<PolaroidSection stamps={stamps} />);
    expect(screen.getByText('Hinoki Coffee')).toBeInTheDocument();
  });

  it('renders diary note in italic when present', () => {
    const stamps = [makeStamp({ diary_note: 'Perfect focus mode' })];
    render(<PolaroidSection stamps={stamps} />);
    expect(screen.getByText('\u201cPerfect focus mode\u201d')).toBeInTheDocument();
  });

  it('shows total visits count in subtitle', () => {
    const shopNames = ['山小孩咖啡', 'Fika Coffee', 'Hinoki Coffee'];
    const stamps = shopNames.map((shop_name, i) =>
      makeStamp({ id: `stamp-${i}`, shop_name })
    );
    render(<PolaroidSection stamps={stamps} />);
    expect(screen.getByText('3 recent visits')).toBeInTheDocument();
  });

  it('shows total visit count even when more than 3 stamps exist', () => {
    const shopNames = ['山小孩咖啡', 'Fika Coffee', 'Hinoki Coffee', 'Rufous Coffee', '珈琲時光'];
    const stamps = shopNames.map((shop_name, i) =>
      makeStamp({ id: `stamp-${i}`, shop_name })
    );
    render(<PolaroidSection stamps={stamps} />);
    expect(screen.getByText('5 recent visits')).toBeInTheDocument();
  });

  it('renders "View All" link pointing to /profile/memories', () => {
    const stamps = [makeStamp()];
    render(<PolaroidSection stamps={stamps} />);
    const link = screen.getByRole('link', { name: /View All/i });
    expect(link).toHaveAttribute('href', '/profile/memories');
  });

  it('does not render "View All" when there are no stamps', () => {
    render(<PolaroidSection stamps={[]} />);
    expect(
      screen.queryByRole('link', { name: /View All/i })
    ).not.toBeInTheDocument();
  });

  it('renders a horizontal scroll container', () => {
    const stamps = [makeStamp()];
    render(<PolaroidSection stamps={stamps} />);
    const scrollContainer = screen.getByTestId('memory-scroll');
    expect(scrollContainer).toBeInTheDocument();
  });
});
