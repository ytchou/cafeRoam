import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StampDetailSheet } from './stamp-detail-sheet';
import { makeStamp } from '@/lib/test-utils/factories';

describe('StampDetailSheet', () => {
  const stamp = {
    id: 'stamp-1',
    user_id: 'user-123',
    shop_id: 'shop-a',
    check_in_id: 'ci-1',
    design_url: '/stamps/shop-a.svg',
    earned_at: '2026-03-01T10:30:00Z',
    shop_name: 'Fika Coffee',
  };

  it('renders shop name and earned date when mounted', () => {
    render(<StampDetailSheet stamp={stamp} onClose={vi.fn()} />);
    expect(screen.getAllByText('Fika Coffee').length).toBeGreaterThan(0);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders a link to the shop page', () => {
    render(<StampDetailSheet stamp={stamp} onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /visit again/i });
    expect(link).toHaveAttribute('href', '/shop/shop-a');
  });

  it('stamp details disappear when the sheet is dismissed', () => {
    const { unmount } = render(
      <StampDetailSheet stamp={stamp} onClose={vi.fn()} />
    );
    unmount();
    expect(screen.queryAllByText('Fika Coffee')).toHaveLength(0);
  });

  it('displays diary note when present', () => {
    const stamp = makeStamp({ diary_note: 'finally found my writing spot' });
    render(<StampDetailSheet stamp={stamp} onClose={vi.fn()} />);
    expect(screen.getByText(/finally found my writing spot/)).toBeInTheDocument();
  });

  it('does not render diary section when diary_note is null', () => {
    const stamp = makeStamp({ diary_note: null });
    render(<StampDetailSheet stamp={stamp} onClose={vi.fn()} />);
    expect(screen.queryByTestId('diary-note')).not.toBeInTheDocument();
  });

  it('shows the check-in photo in the polaroid card', () => {
    const stamp = makeStamp({ photo_url: 'https://example.com/photo.jpg' });
    render(<StampDetailSheet stamp={stamp} onClose={vi.fn()} />);
    const img = screen.getByRole('img', { name: stamp.shop_name as string });
    expect(img).toBeInTheDocument();
  });
});
