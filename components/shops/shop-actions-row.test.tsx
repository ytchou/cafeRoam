import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/hooks/use-user', () => ({
  useUser: () => ({
    user: { id: 'user-123' },
    isLoading: false,
  }),
}));

vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({ isSaved: () => false }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('./check-in-sheet', () => ({
  CheckInSheet: () => null,
}));

vi.mock('./check-in-popover', () => ({
  CheckInPopover: () => null,
}));

vi.mock('./save-popover', () => ({
  SavePopover: () => null,
}));

vi.mock('./share-popover', () => ({
  SharePopover: () => null,
}));

vi.mock('./follow-button', () => ({
  FollowButton: () => <div data-testid="follow-button" />,
}));

vi.mock('@/components/lists/save-to-list-sheet', () => ({
  SaveToListSheet: () => null,
}));

vi.mock('./report-issue-dialog', () => ({
  ReportIssueDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="report-dialog">ReportIssueDialog</div> : null,
}));

import { ShopActionsRow } from './shop-actions-row';

const props = {
  shopId: 'shop-123',
  shopName: 'Test Cafe',
  shareUrl: 'https://caferoam.tw/shops/shop-123/test-cafe',
};

describe('ShopActionsRow', () => {
  it('renders the report button', () => {
    render(<ShopActionsRow {...props} />);

    expect(
      screen.getByRole('button', { name: /回報錯誤/ })
    ).toBeInTheDocument();
  });

  it('shows the report dialog when the report button is clicked', async () => {
    const user = userEvent.setup();

    render(<ShopActionsRow {...props} />);

    await user.click(screen.getByRole('button', { name: /回報錯誤/ }));

    expect(screen.getByTestId('report-dialog')).toBeInTheDocument();
  });
});
