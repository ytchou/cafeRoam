import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';

const LIST_ID_1 = 'e3b0c442-98a1-441d-b22f-5a00bd8c3e1b';
const USER_ID = 'c7d2a819-5e3f-4c8b-b6a0-1234567890ab';
const SHOP_ID_1 = 'a1b2c3d4-5678-90ab-cdef-1234567890ab';
const SHOP_ID_2 = 'b2c3d4e5-6789-01bc-def0-2345678901bc';

const SHOP_DATA = [
  {
    id: SHOP_ID_1,
    name: '山小孩咖啡',
    address: '台北市大安區溫州街74巷',
    latitude: 25.0216,
    longitude: 121.5312,
    rating: 4.6,
    review_count: 287,
    photo_urls: [],
    taxonomy_tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: SHOP_ID_2,
    name: 'Simple Kaffa',
    address: '台北市中山區赤峰街1號',
    latitude: 25.0528,
    longitude: 121.5201,
    rating: 4.5,
    review_count: 512,
    photo_urls: [],
    taxonomy_tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const LISTS_DATA = [
  {
    id: LIST_ID_1,
    user_id: USER_ID,
    name: 'Work spots',
    items: [
      { shop_id: SHOP_ID_1, added_at: '2026-01-15T10:00:00Z' },
      { shop_id: SHOP_ID_2, added_at: '2026-01-15T11:00:00Z' },
    ],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
];

vi.mock('next/navigation', () => ({
  useParams: () => ({ listId: LIST_ID_1 }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => `/lists/${LIST_ID_1}`,
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: () => false,
  useMediaQuery: () => false,
}));

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Handle: () => null,
    Title: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
  },
}));

vi.mock('react-map-gl/mapbox', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  Marker: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => <div onClick={onClick}>{children}</div>,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

import ListDetailPage from './page';

describe('/lists/[listId] page', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test');
    mockFetch.mockReset();
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/lists') {
        return Promise.resolve({ ok: true, json: async () => LISTS_DATA });
      }
      // /api/lists/${listId}/shops
      return Promise.resolve({ ok: true, json: async () => SHOP_DATA });
    });
  });

  it('the list name is shown in the page header', async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListDetailPage />
      </SWRConfig>
    );
    expect((await screen.findAllByText('Work spots')).length).toBeGreaterThan(
      0
    );
  });

  it("the user's saved shops appear as cards on the list detail page", async () => {
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListDetailPage />
      </SWRConfig>
    );
    expect(await screen.findByText('山小孩咖啡')).toBeInTheDocument();
    expect(await screen.findByText('Simple Kaffa')).toBeInTheDocument();
  });

  it('an empty state is shown when the list has no saved shops', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/lists') {
        return Promise.resolve({ ok: true, json: async () => LISTS_DATA });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ListDetailPage />
      </SWRConfig>
    );
    expect(
      await screen.findByText(/no shops in this list/i)
    ).toBeInTheDocument();
  });
});
