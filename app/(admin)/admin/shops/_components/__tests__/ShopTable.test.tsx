import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" role="menuitem" onClick={onClick}>
      {children}
    </button>
  ),
}));

import { ShopTable } from '../ShopTable';

global.fetch = vi.fn();

const mockShops = [
  {
    id: 'shop-1',
    name: 'Cafe A',
    processing_status: 'timed_out',
    address: '123 Main St',
    source: 'admin',
    tag_count: 3,
    has_embedding: false,
    enriched_at: null,
  },
  {
    id: 'shop-2',
    name: 'Cafe B',
    processing_status: 'pending_review',
    address: '456 Oak Ave',
    source: 'community',
    tag_count: 0,
    has_embedding: false,
    enriched_at: null,
  },
  {
    id: 'shop-3',
    name: 'Cafe C',
    processing_status: 'live',
    address: '789 Pine Rd',
    source: 'admin',
    tag_count: 5,
    has_embedding: true,
    enriched_at: '2024-01-01T00:00:00Z',
  },
];

const defaultProps = {
  shops: mockShops,
  loading: false,
  offset: 0,
  total: 3,
  onPageChange: vi.fn(),
  getToken: vi.fn().mockResolvedValue('test-token'),
  onRefresh: vi.fn(),
};

function renderShopTable() {
  return render(
    <ShopTable {...(defaultProps as Parameters<typeof ShopTable>[0])} />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ShopTable multi-select', () => {
  it('shows checkboxes for all rows regardless of filter', () => {
    renderShopTable();
    const checkboxes = screen.getAllByRole('checkbox');

    expect(checkboxes).toHaveLength(4);
  });

  it('shows bulk toolbar when at least one shop is selected', async () => {
    renderShopTable();
    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);

    fireEvent.click(rowCheckboxes[0]);

    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});

describe('ShopTable row actions menu', () => {
  it('shows Retry action for timed_out shop', async () => {
    renderShopTable();
    const moreButtons = screen.getAllByLabelText(/row actions/i);

    fireEvent.click(moreButtons[0]);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows Approve and Reject for pending_review shop', async () => {
    renderShopTable();
    const moreButtons = screen.getAllByLabelText(/row actions/i);

    fireEvent.click(moreButtons[1]);

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('hides row actions button for live shop', () => {
    renderShopTable();
    const moreButtons = screen.queryAllByLabelText(/row actions/i);

    expect(moreButtons).toHaveLength(2);
  });
});

describe('ShopTable bulk retry', () => {
  it('calls /api/admin/shops/retry with selected shop IDs and shows success toast', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reset: 1, skipped: 0 }),
    } as Response);

    renderShopTable();

    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByText(/retry selected/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/shops/retry',
        expect.objectContaining({ method: 'POST' })
      );
      expect(toast.success).toHaveBeenCalledWith('1 shop(s) reset to pending');
    });
  });
});
