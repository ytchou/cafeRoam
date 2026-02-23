import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({ from: vi.fn() }),
  createServerClient: vi.fn().mockReturnValue({ from: vi.fn() }),
}));

describe('createSupabaseBrowserClient', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    const { createSupabaseBrowserClient } = await import('./supabase');
    expect(() => createSupabaseBrowserClient()).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    const { createSupabaseBrowserClient } = await import('./supabase');
    expect(() => createSupabaseBrowserClient()).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  });

  it('returns a client when env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    const { createSupabaseBrowserClient } = await import('./supabase');
    const client = createSupabaseBrowserClient();
    expect(client).toBeDefined();
  });
});

describe('createSupabaseServerClient', () => {
  const cookieStore = {
    getAll: () => [],
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    const { createSupabaseServerClient } = await import('./supabase');
    expect(() => createSupabaseServerClient(cookieStore)).toThrow(
      'Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL'
    );
  });

  it('returns a client when env vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
    const { createSupabaseServerClient } = await import('./supabase');
    const client = createSupabaseServerClient(cookieStore);
    expect(client).toBeDefined();
  });
});
