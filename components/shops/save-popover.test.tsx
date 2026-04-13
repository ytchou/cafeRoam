import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}));

const mockSaveShop = vi.fn();
const mockRemoveShop = vi.fn();
const mockCreateList = vi.fn();
let mockLists: Array<{
  id: string;
  name: string;
  items: Array<{ shop_id: string; added_at?: string }>;
}> = [];
let mockIsInList = vi.fn((_listId: string, _shopId: string) => false);

vi.mock('@/lib/hooks/use-user-lists', () => ({
  useUserLists: () => ({
    lists: mockLists,
    isLoading: false,
    error: undefined,
    isSaved: vi.fn(() => false),
    isInList: mockIsInList,
    saveShop: mockSaveShop,
    removeShop: mockRemoveShop,
    createList: mockCreateList,
  }),
}));

import { toast } from 'sonner';
import { SavePopover } from './save-popover';

describe('SavePopover optimistic toggles', () => {
  const shopId = 'shop-123';
  const listId = 'list-abc';

  beforeEach(() => {
    vi.clearAllMocks();
    mockLists = [
      {
        id: listId,
        name: 'My Favourites',
        items: [],
      },
    ];
    mockIsInList = vi.fn((_listId: string, _shopId: string) => false);
    mockSaveShop.mockResolvedValue(undefined);
    mockRemoveShop.mockResolvedValue(undefined);
    mockCreateList.mockResolvedValue(undefined);
  });

  it('updates the checkbox immediately before the server call resolves', async () => {
    const user = userEvent.setup();
    let resolveSave!: () => void;

    mockSaveShop.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        })
    );

    render(
      <SavePopover
        shopId={shopId}
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Save</button>}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'My Favourites' });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(mockSaveShop).toHaveBeenCalledWith(listId, shopId);
    expect(checkbox).toBeChecked();

    resolveSave();
    await waitFor(() => expect(mockSaveShop).toHaveBeenCalledTimes(1));
  });

  it('rolls the checkbox back and shows a toast when the server rejects', async () => {
    const user = userEvent.setup();
    let rejectSave!: (error: Error) => void;

    mockSaveShop.mockImplementation(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectSave = reject;
        })
    );

    render(
      <SavePopover
        shopId={shopId}
        open={true}
        onOpenChange={vi.fn()}
        trigger={<button>Save</button>}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'My Favourites' });

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    rejectSave(new Error('Network error'));

    await waitFor(() => {
      expect(checkbox).not.toBeChecked();
      expect(toast.error).toHaveBeenCalledWith('Something went wrong');
    });
  });
});
