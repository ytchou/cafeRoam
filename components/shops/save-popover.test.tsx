import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { SavePopover } from './save-popover';

const mockLists = [
  { id: 'l1', name: 'Weekend Picks', items: [{ shop_id: 'other' }] },
  { id: 'l2', name: 'Work Spots', items: [{ shop_id: 'shop-1' }] },
];
const mockIsInList = vi.fn((listId: string, shopId: string) =>
  mockLists.find((l) => l.id === listId)?.items.some((i) => i.shop_id === shopId) ?? false
);
const mockSaveShop = vi.fn();
const mockRemoveShop = vi.fn();
const mockCreateList = vi.fn();

vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({
    lists: mockLists,
    isInList: mockIsInList,
    saveShop: mockSaveShop,
    removeShop: mockRemoveShop,
    createList: mockCreateList,
    isSaved: vi.fn().mockReturnValue(false),
  }),
}));

describe('SavePopover', () => {
  const defaultProps = {
    shopId: 'shop-1',
    open: true,
    onOpenChange: vi.fn(),
    trigger: <button>Save</button>,
  };

  it('renders all user lists', () => {
    render(<SavePopover {...defaultProps} />);
    expect(screen.getByText('Weekend Picks')).toBeInTheDocument();
    expect(screen.getByText('Work Spots')).toBeInTheDocument();
  });

  it('shows a checked state for lists containing this shop', () => {
    render(<SavePopover {...defaultProps} />);
    const workSpotsCheckbox = screen.getByRole('checkbox', { name: /Work Spots/i });
    expect(workSpotsCheckbox).toBeChecked();
  });

  it('shows "Create new list" option when under the 3-list cap', () => {
    render(<SavePopover {...defaultProps} />);
    expect(screen.getByText(/Create new list/i)).toBeInTheDocument();
  });

  it('calls saveShop when unchecked list is toggled', () => {
    render(<SavePopover {...defaultProps} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Weekend Picks/i }));
    expect(mockSaveShop).toHaveBeenCalledWith('l1', 'shop-1');
  });
});
