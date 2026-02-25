import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateBrowserClient = vi.hoisted(() =>
  vi.fn().mockReturnValue({ type: 'browser-client' })
);
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

import { createClient } from './client';

describe('createClient (browser)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('calls createBrowserClient with env vars', () => {
    createClient();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
  });

  it('returns the Supabase browser client', () => {
    const client = createClient();
    expect(client).toEqual({ type: 'browser-client' });
  });
});
