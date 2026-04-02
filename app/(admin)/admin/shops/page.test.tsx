import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMockSupabaseAuth,
  createMockRouter,
} from '@/lib/test-utils/mocks';
import { makeSession, makeShop } from '@/lib/test-utils/factories';

const mockAuth = createMockSupabaseAuth();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

const mockRouter = createMockRouter();
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/admin/shops',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const testSession = makeSession();

import AdminShopsList from './page';

function makePendingReviewShopsResponse(count: number) {
  const shops = Array.from({ length: count }, (_, i) =>
    makeShop({
      id: `shop-pr-${String(i + 1).padStart(3, '0')}`,
      name: `待審咖啡 ${i + 1}`,
      address: `台北市大安區某街${i + 1}號`,
      processing_status: 'pending_review',
      source: 'cafe_nomad',
      updated_at: '2026-04-01T08:00:00.000Z',
    })
  );
  return { shops, total: count, offset: 0, limit: 20 };
}

describe('AdminShopsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({
      data: { session: testSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders shops table with data when the API returns a list of shops', async () => {
    const shopsResponse = {
      shops: [
        makeShop({
          id: 'shop-001',
          name: '山小孩咖啡',
          address: '台北市大安區溫州街74巷5弄2號',
          processing_status: 'live',
          source: 'cafe_nomad',
          updated_at: '2026-02-28T10:00:00.000Z',
        }),
        makeShop({
          id: 'shop-002',
          name: '森高砂咖啡',
          address: '台北市中正區羅斯福路三段210巷8弄12號',
          processing_status: 'pending',
          source: 'google_maps',
          updated_at: '2026-03-01T14:30:00.000Z',
        }),
      ],
      total: 2,
      offset: 0,
      limit: 20,
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(shopsResponse),
    });

    render(<AdminShopsList />);

    await waitFor(() => {
      expect(screen.getByText('山小孩咖啡')).toBeInTheDocument();
    });

    expect(screen.getByText('森高砂咖啡')).toBeInTheDocument();
    expect(
      screen.getByText('台北市大安區溫州街74巷5弄2號')
    ).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Cafe Nomad')).toBeInTheDocument();
    expect(within(table).getByText('google_maps')).toBeInTheDocument();
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/shops'),
      expect.objectContaining({
        headers: {
          Authorization: `Bearer ${testSession.access_token}`,
        },
      })
    );
  });

  it('shows create shop form when the Create Shop button is clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ shops: [], total: 0, offset: 0, limit: 20 }),
    });

    const user = userEvent.setup();
    render(<AdminShopsList />);

    await waitFor(() => {
      expect(screen.getByText('Shops')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', {
      name: /create shop/i,
    });
    await user.click(createButton);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument();
  });

  it('shows error state when the shops API returns an error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ detail: 'Forbidden: admin role required' }),
    });

    render(<AdminShopsList />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(
      screen.getByText('Forbidden: admin role required')
    ).toBeInTheDocument();
  });

  it('shows confirmation dialog before bulk approving selected shops', async () => {
    const shopsResponse = makePendingReviewShopsResponse(3);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(shopsResponse),
    });

    const user = userEvent.setup();
    render(<AdminShopsList />);

    // Wait for shops to load
    await waitFor(() => {
      expect(screen.getByText('待審咖啡 1')).toBeInTheDocument();
    });

    // Switch to pending_review filter to show the bulk approve bar
    const statusSelect = screen.getByDisplayValue('All statuses');
    await user.selectOptions(statusSelect, 'pending_review');
    await waitFor(() => {
      expect(screen.getByText('待審咖啡 1')).toBeInTheDocument();
    });

    // Select one shop
    const checkbox = screen.getByRole('checkbox', {
      name: /select 待審咖啡 1/i,
    });
    await user.click(checkbox);

    // Click "Approve Selected" — should NOT call fetch yet
    const approveSelectedBtn = screen.getByRole('button', {
      name: /approve selected/i,
    });
    await user.click(approveSelectedBtn);

    // Confirmation dialog must appear
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/approve 1 selected shop\(s\)\?/i)
    ).toBeInTheDocument();

    // Set up mock for the bulk-approve call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ approved: 1, queued: 1 }),
    });
    // shops refetch after approve
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(shopsResponse),
    });

    // Click confirm
    const confirmBtn = within(dialog).getByRole('button', {
      name: /^approve$/i,
    });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/shops/bulk-approve',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('shows confirmation before bulk approving all pending_review shops', async () => {
    const shopsResponse = makePendingReviewShopsResponse(5);

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(shopsResponse),
    });

    const user = userEvent.setup();
    render(<AdminShopsList />);

    await waitFor(() => {
      expect(screen.getByText('待審咖啡 1')).toBeInTheDocument();
    });

    // Switch to pending_review filter to show the bulk approve bar
    const statusSelect = screen.getByDisplayValue('All statuses');
    await user.selectOptions(statusSelect, 'pending_review');
    await waitFor(() => {
      expect(screen.getByText('待審咖啡 1')).toBeInTheDocument();
    });

    // Click "Approve All" without selecting any shops
    const approveAllBtn = screen.getByRole('button', { name: /approve all/i });
    await user.click(approveAllBtn);

    // Confirmation dialog must appear with "ALL" copy
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByText(/approve ALL pending_review shops\?/i)
    ).toBeInTheDocument();

    // Dismiss — fetch should not have been called for bulk-approve
    const cancelBtn = within(dialog).getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);

    expect(
      mockFetch.mock.calls.some((c) => String(c[0]).includes('bulk-approve'))
    ).toBe(false);
  });
});
