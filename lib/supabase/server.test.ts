import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateServerClient = vi.hoisted(() =>
  vi.fn().mockReturnValue({ type: 'server-client' })
);
vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

const mockCookieStore = vi.hoisted(() => ({
  getAll: vi.fn().mockReturnValue([{ name: 'sb-token', value: 'abc' }]),
  set: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import { createClient } from './server';

describe('createClient (server)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    mockCookieStore.getAll.mockReturnValue([
      { name: 'sb-token', value: 'abc' },
    ]);
    mockCookieStore.set.mockReset();
  });

  it('calls createServerClient with env vars', async () => {
    await createClient();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    );
  });

  it('returns the Supabase server client', async () => {
    const client = await createClient();
    expect(client).toEqual({ type: 'server-client' });
  });

  it('cookie adapter getAll delegates to cookie store', async () => {
    await createClient();
    const [, , { cookies }] = mockCreateServerClient.mock.calls[0];
    const result = cookies.getAll();
    expect(mockCookieStore.getAll).toHaveBeenCalled();
    expect(result).toEqual([{ name: 'sb-token', value: 'abc' }]);
  });

  it('cookie adapter setAll calls set for each cookie', async () => {
    await createClient();
    const [, , { cookies }] = mockCreateServerClient.mock.calls[0];
    cookies.setAll([
      { name: 'a', value: '1', options: {} },
      { name: 'b', value: '2', options: {} },
    ]);
    expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
    expect(mockCookieStore.set).toHaveBeenCalledWith('a', '1', {});
    expect(mockCookieStore.set).toHaveBeenCalledWith('b', '2', {});
  });

  it('cookie adapter setAll swallows errors from Server Components', async () => {
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('cannot set cookie in server component');
    });
    await createClient();
    const [, , { cookies }] = mockCreateServerClient.mock.calls[0];
    // Should not throw
    expect(() =>
      cookies.setAll([{ name: 'x', value: 'y', options: {} }])
    ).not.toThrow();
  });
});
