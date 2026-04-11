import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseAuth,
  createMockRouter,
} from '@/lib/test-utils/mocks';
import { makeSession } from '@/lib/test-utils/factories';

const mockAuth = createMockSupabaseAuth();
const mockRouter = createMockRouter();
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: mockAuth }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/admin/roles',
}));

import RolesPage from './page';
const testSession = makeSession();

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.getSession.mockResolvedValue({
    data: { session: testSession },
    error: null,
  });
});

describe('AdminRolesPage', () => {
  it('renders role grants table', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            user_id: 'u1',
            role: 'admin',
            email: 'admin@example.com',
            granted_at: '2026-01-01T00:00:00Z',
          },
          {
            user_id: 'u2',
            role: 'blogger',
            email: 'coffee.blogger@example.com',
            granted_at: '2026-01-02T00:00:00Z',
          },
        ]),
    });

    render(<RolesPage />);
    await screen.findByText('admin@example.com');
    expect(screen.getByText('coffee.blogger@example.com')).toBeInTheDocument();
    // Role badges in the table body (not the filter/grant dropdowns)
    const table = screen.getByRole('table');
    expect(within(table).getAllByText('admin').length).toBeGreaterThan(0);
    expect(within(table).getByText('blogger')).toBeInTheDocument();
  });

  it('filters by role type', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            user_id: 'u1',
            role: 'admin',
            email: 'admin@example.com',
            granted_at: '2026-01-01T00:00:00Z',
          },
        ]),
    });

    render(<RolesPage />);
    await screen.findByText('admin@example.com');

    const trigger = screen.getByRole('combobox', { name: /filter by role/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const option = await screen.findByRole('option', { name: /^admin$/i });
    fireEvent.click(option);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/roles?role=admin'),
        expect.any(Object)
      );
    });
  });

  it('grants a new role via dialog form', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ user_id: 'u3', role: 'member' }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    const user = userEvent.setup();
    render(<RolesPage />);

    await user.click(screen.getByRole('button', { name: /grant role/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(
      within(dialog).getByLabelText(/user id or email/i),
      'user@test.com'
    );
    await user.click(within(dialog).getByRole('button', { name: /^grant$/i }));

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/roles',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"user_id"'),
      })
    );
  });

  it('shows confirmation before revoking a role', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            user_id: 'u1',
            role: 'blogger',
            email: 'coffee.blogger@example.com',
            granted_at: '2026-01-01T00:00:00Z',
          },
        ]),
    });

    const user = userEvent.setup();
    render(<RolesPage />);
    await screen.findByText('coffee.blogger@example.com');

    await user.click(screen.getByRole('button', { name: /revoke/i }));

    const alertDialog = await screen.findByRole('alertdialog');
    expect(alertDialog).toBeInTheDocument();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });
    await user.click(
      within(alertDialog).getByRole('button', { name: /revoke/i })
    );

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/roles/u1/blogger',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
