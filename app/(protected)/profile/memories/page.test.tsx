import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SWRConfig } from 'swr';
import { makeStamp } from '@/lib/test-utils/factories';
import MemoriesPage from './page';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
    },
  }),
}));

const stampsData = [
  makeStamp({ id: 'stamp-1', shop_name: 'Fika Coffee' }),
  makeStamp({ id: 'stamp-2', shop_name: 'Buna Coffee' }),
];

function mockFetch(stamps = stampsData) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => stamps,
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe('MemoriesPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch();
  });

  it('renders the page title', async () => {
    render(<MemoriesPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('My Memories')).toBeInTheDocument();
    });
  });

  it('renders the cork board with stamps after loading', async () => {
    render(<MemoriesPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(screen.getByText('Fika Coffee')).toBeInTheDocument();
      expect(screen.getByText('Buna Coffee')).toBeInTheDocument();
    });
  });

  it('renders a back link to profile', () => {
    render(<MemoriesPage />, { wrapper: Wrapper });
    const link = screen.getByRole('link', { name: /back/i });
    expect(link).toHaveAttribute('href', '/profile');
  });

  it('shows an error message when the stamps API is unavailable', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Backend unavailable' }),
    });
    render(<MemoriesPage />, { wrapper: Wrapper });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /try again/i })
      ).toBeInTheDocument();
    });
    // Restore default mock for subsequent tests
    mockFetch();
  });
});
