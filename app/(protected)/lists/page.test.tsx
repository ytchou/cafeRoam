import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';

const LIST_ID_1 = 'e3b0c442-98a1-441d-b22f-5a00bd8c3e1b';
const LIST_ID_2 = 'f4c1d553-a9b2-552e-c330-6b11ce9d4f2c';
const LIST_ID_3 = 'a7e8b9c0-d1f2-4a3b-8c5d-e6f7a8b9c0d1';
const USER_ID = 'c7d2a819-5e3f-4c8b-b6a0-1234567890ab';
const SHOP_ID_1 = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';

const THREE_LISTS = [
  {
    id: LIST_ID_1,
    user_id: USER_ID,
    name: 'Work spots',
    items: [{ shop_id: SHOP_ID_1, added_at: '2026-01-15T10:00:00Z' }],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: LIST_ID_2,
    user_id: USER_ID,
    name: 'Date night',
    items: [],
    created_at: '2026-01-16T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
  },
  {
    id: LIST_ID_3,
    user_id: USER_ID,
    name: 'Weekend',
    items: [],
    created_at: '2026-01-17T10:00:00Z',
    updated_at: '2026-01-17T10:00:00Z',
  },
];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/lists',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
}));

vi.mock('react-map-gl/mapbox', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-map">{children}</div>
  ),
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-marker">{children}</div>
  ),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

import ListsPage from './page';

describe('/lists page', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/pins')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => THREE_LISTS });
    });
  });

  it("a user's lists are shown on the page", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );
    expect(await screen.findByText('Work spots')).toBeInTheDocument();
    expect(await screen.findByText('Date night')).toBeInTheDocument();
    expect(await screen.findByText('Weekend')).toBeInTheDocument();
  });

  it('the 3/3 cap indicator is visible when the user is at the limit', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );
    expect(await screen.findByText(/3.*\/.*3|3\s*\/\s*3/)).toBeInTheDocument();
  });

  it('create list option is not shown when the user is at the 3-list cap', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );
    // Wait for lists to load, then verify no create slot is shown
    await screen.findByText('Work spots');
    expect(screen.queryByText('Create a new list')).not.toBeInTheDocument();
  });

  it('user can create a new list when under the cap', async () => {
    const oneList = [THREE_LISTS[0]];
    const NEW_LIST_ID = 'b2c3d4e5-6789-01ab-cdef-234567890abc';
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/pins')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => oneList });
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );

    expect(await screen.findByText('Work spots')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    // Open create dialog
    const createButton = screen.getByText('Create a new list');
    await userEvent.click(createButton);

    // Type name and confirm
    const nameInput = screen.getByPlaceholderText('List name');
    await userEvent.type(nameInput, '我的最愛');

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    );
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => [
          ...oneList,
          {
            id: NEW_LIST_ID,
            user_id: USER_ID,
            name: '我的最愛',
            items: [],
            created_at: '2026-03-05T10:00:00Z',
            updated_at: '2026-03-05T10:00:00Z',
          },
        ],
      })
    );

    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(screen.getByText('我的最愛')).toBeInTheDocument();
    });
  });

  it('user sees an error toast when the backend rejects list creation', async () => {
    const twoLists = THREE_LISTS.slice(0, 2);
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/pins')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => twoLists });
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );

    expect(await screen.findByText('Work spots')).toBeInTheDocument();

    // Open create dialog and submit
    const createButton = screen.getByText('Create a new list');
    await userEvent.click(createButton);

    const nameInput = screen.getByPlaceholderText('List name');
    await userEvent.type(nameInput, 'Fourth list');

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ detail: 'Maximum 3 lists per user' }),
      })
    );

    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));

    const { toast } = await import('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('3-list limit')
      );
    });
  });

  it('user can delete a list via the options menu', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListsPage />
      </SWRConfig>
    );

    expect(await screen.findByText('Work spots')).toBeInTheDocument();

    const optionsButtons = screen.getAllByRole('button', {
      name: /list options/i,
    });

    await user.click(optionsButtons[0]);

    const deleteButton = await screen.findByRole('button', { name: /delete/i });

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: async () => ({}) })
    );
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => THREE_LISTS.slice(1),
      })
    );

    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText('Work spots')).not.toBeInTheDocument();
    });
  });
});
