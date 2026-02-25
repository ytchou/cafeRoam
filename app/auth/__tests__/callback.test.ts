import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock is hoisted — create refs with vi.hoisted() so the factory can reference them
const mockExchangeCodeForSession = vi.hoisted(() => vi.fn());
const mockRefreshSession = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: { session: {} }, error: null })
);
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession, refreshSession: mockRefreshSession },
    from: mockFrom,
  }),
}));

import { GET } from '../callback/route';

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`);
}

function makeProfileUpdateChain() {
  const mockExecute = vi.fn().mockResolvedValue({ data: [], error: null });
  const mockIs = vi.fn().mockReturnValue(mockExecute);
  const mockEq = vi.fn().mockReturnValue({ is: mockIs });
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
  return { mockUpdate, mockEq, mockIs };
}

describe('auth/callback GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { mockUpdate } = makeProfileUpdateChain();
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it('redirects to /login when no code in URL', async () => {
    const res = await GET(makeRequest('/auth/callback'));
    expect(res.headers.get('location')).toContain('/login');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('redirects to /login when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'bad code' }, data: {} });
    const res = await GET(makeRequest('/auth/callback?code=bad'));
    expect(res.headers.get('location')).toContain('/login');
  });

  it('redirects to /onboarding/consent when user has no consent in app_metadata or user_metadata', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1', app_metadata: {}, user_metadata: {} },
        session: { access_token: 'tok' },
      },
    });
    const res = await GET(makeRequest('/auth/callback?code=abc'));
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/onboarding/consent');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('writes consent directly and redirects for new email signup (user_metadata consented, app not)', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1', app_metadata: {}, user_metadata: { pdpa_consented: true } },
        session: { access_token: 'tok' },
      },
    });
    const { mockUpdate, mockEq, mockIs } = makeProfileUpdateChain();
    mockFrom.mockReturnValue({ update: mockUpdate });

    const res = await GET(makeRequest('/auth/callback?code=abc&returnTo=/lists'));

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pdpa_consent_at: expect.any(String) })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'u1');
    expect(mockIs).toHaveBeenCalledWith('pdpa_consent_at', null);
    expect(mockRefreshSession).toHaveBeenCalled();
    expect(res.headers.get('location')).toContain('/lists');
  });

  it('passes through to returnTo when user already has app_metadata consent', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1', app_metadata: { pdpa_consented: true }, user_metadata: {} },
        session: { access_token: 'tok' },
      },
    });
    const res = await GET(makeRequest('/auth/callback?code=abc&returnTo=/search'));
    expect(res.headers.get('location')).toContain('/search');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('safeReturnTo: rejects // protocol-relative redirect', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1', app_metadata: { pdpa_consented: true }, user_metadata: {} },
        session: { access_token: 'tok' },
      },
    });
    const res = await GET(makeRequest('/auth/callback?code=abc&returnTo=//evil.com'));
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('evil.com');
    expect(location).toMatch(/\/$/);
  });

  it('safeReturnTo: rejects non-relative URL', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: {
        user: { id: 'u1', app_metadata: { pdpa_consented: true }, user_metadata: {} },
        session: { access_token: 'tok' },
      },
    });
    const res = await GET(makeRequest('/auth/callback?code=abc&returnTo=https://evil.com'));
    const location = res.headers.get('location') ?? '';
    expect(location).not.toContain('evil.com');
  });
});
