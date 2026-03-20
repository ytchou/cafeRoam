import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn().mockReturnValue(false), // default: mobile
}));
vi.mock('./check-in-sheet', () => ({
  CheckInSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="check-in-sheet">CheckInSheet</div> : null,
}));
vi.mock('@/components/lists/save-to-list-sheet', () => ({
  SaveToListSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-sheet">SaveToListSheet</div> : null,
}));
vi.mock('./save-popover', () => ({
  SavePopover: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-popover">SavePopover</div> : null,
}));
vi.mock('./share-popover', () => ({
  SharePopover: ({ open }: { open: boolean }) =>
    open ? <div data-testid="share-popover">SharePopover</div> : null,
}));
vi.mock('./check-in-popover', () => ({
  CheckInPopover: ({ open }: { open: boolean }) =>
    open ? <div data-testid="check-in-popover">CheckInPopover</div> : null,
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: {} } },
      }),
    },
  }),
}));
vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({ isSaved: () => false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ShopActionsRow } from './shop-actions-row';

const defaultProps = {
  shopId: 'fika-fika-da-an',
  shopName: 'Fika Fika Café',
  shareUrl: 'https://caferoam.app/shops/fika-fika-da-an/fika-fika-cafe',
};

describe('ShopActionsRow — mobile', () => {
  it('renders the Check In primary button', () => {
    render(<ShopActionsRow {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Check In 打卡/i })).toBeInTheDocument();
  });

  it('opens CheckInSheet (not popover) on mobile when Check In is tapped', async () => {
    render(<ShopActionsRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Check In 打卡/i }));
    expect(await screen.findByTestId('check-in-sheet')).toBeInTheDocument();
  });

  it('opens SaveToListSheet on mobile when Save is tapped', async () => {
    render(<ShopActionsRow {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    expect(await screen.findByTestId('save-sheet')).toBeInTheDocument();
  });
});
