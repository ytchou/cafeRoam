import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SharePopover } from './share-popover';

vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

describe('SharePopover', () => {
  const defaultProps = {
    shopId: 'shop-1',
    shopName: 'Rufous Coffee',
    shareUrl: 'https://caferoam.app/shops/shop-1/rufous-coffee',
    open: true,
    onOpenChange: vi.fn(),
    trigger: <button>Share</button>,
  };

  it('displays the share URL', () => {
    render(<SharePopover {...defaultProps} />);
    expect(screen.getByDisplayValue(/rufous-coffee/i)).toBeInTheDocument();
  });

  it('shows a Copy button', () => {
    render(<SharePopover {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument();
  });

  it('copies the URL to clipboard when Copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<SharePopover {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(writeText).toHaveBeenCalledWith(defaultProps.shareUrl);
  });
});
