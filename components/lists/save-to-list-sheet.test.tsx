import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available when vi.mock factory runs (mock is hoisted above declarations)
const { mockUseUserLists } = vi.hoisted(() => ({ mockUseUserLists: vi.fn() }));

const mockSaveShop = vi.fn();
const mockRemoveShop = vi.fn();
const mockCreateList = vi.fn();

vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: mockUseUserLists,
}));

// Mock vaul/drawer — render children directly
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { SaveToListSheet } from './save-to-list-sheet';

const BASE_HOOK_VALUES = {
  isSaved: vi.fn(),
  isInList: (listId: string, shopId: string) => {
    if (listId === 'l1' && (shopId === 's1' || shopId === 's2')) return true;
    if (listId === 'l2' && shopId === 's3') return true;
    return false;
  },
  saveShop: mockSaveShop,
  removeShop: mockRemoveShop,
  createList: mockCreateList,
  deleteList: vi.fn(),
  renameList: vi.fn(),
  isLoading: false,
  error: null,
};

const TWO_LISTS = [
  { id: 'l1', name: 'Work spots', items: [{ shop_id: 's1' }, { shop_id: 's2' }] },
  { id: 'l2', name: 'Date night', items: [{ shop_id: 's3' }] },
];

const THREE_LISTS = [
  ...TWO_LISTS,
  { id: 'l3', name: 'Weekend', items: [] },
];

beforeEach(() => {
  mockSaveShop.mockReset();
  mockRemoveShop.mockReset();
  mockCreateList.mockReset();
  mockUseUserLists.mockReturnValue({ ...BASE_HOOK_VALUES, lists: TWO_LISTS });
});

describe('SaveToListSheet', () => {
  it('lists containing the shop show as checked', () => {
    render(<SaveToListSheet shopId="s1" open={true} onOpenChange={vi.fn()} />);
    const workCheckbox = screen.getByRole('checkbox', { name: /work spots/i });
    const dateCheckbox = screen.getByRole('checkbox', { name: /date night/i });
    expect(workCheckbox).toBeChecked();
    expect(dateCheckbox).not.toBeChecked();
  });

  it('when a user checks an unchecked list the shop is saved to it', async () => {
    render(<SaveToListSheet shopId="s1" open={true} onOpenChange={vi.fn()} />);
    const dateCheckbox = screen.getByRole('checkbox', { name: /date night/i });
    await userEvent.click(dateCheckbox);
    expect(mockSaveShop).toHaveBeenCalledWith('l2', 's1');
  });

  it('when a user unchecks a checked list the shop is removed from it', async () => {
    render(<SaveToListSheet shopId="s1" open={true} onOpenChange={vi.fn()} />);
    const workCheckbox = screen.getByRole('checkbox', { name: /work spots/i });
    await userEvent.click(workCheckbox);
    expect(mockRemoveShop).toHaveBeenCalledWith('l1', 's1');
  });

  it('create new list input is shown when the user has fewer than 3 lists', () => {
    render(<SaveToListSheet shopId="s1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/create new list/i)).toBeInTheDocument();
  });

  it('create new list input is hidden when the user has reached the 3-list cap', () => {
    mockUseUserLists.mockReturnValue({ ...BASE_HOOK_VALUES, lists: THREE_LISTS });
    render(<SaveToListSheet shopId="s1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/create new list/i)).not.toBeInTheDocument();
  });
});
