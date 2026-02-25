import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.mock() is hoisted to top of file, so the factory must not reference
// variables declared below. Use vi.hoisted() to create refs that survive hoisting.
const mockUpdateSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}));

import { middleware } from '../../middleware';

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`http://localhost${pathname}`);
}

function makeUser(appMetaOverrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    app_metadata: {
      pdpa_consented: true,
      deletion_requested: false,
      ...appMetaOverrides,
    },
  };
}

const passThroughResponse = NextResponse.next();

describe('middleware route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSession.mockResolvedValue({
      user: makeUser(),
      supabaseResponse: passThroughResponse,
    });
  });

  describe('public routes — pass through without auth', () => {
    it.each(['/', '/login', '/signup', '/auth/callback', '/privacy'])(
      '%s passes through without a session',
      async (pathname) => {
        mockUpdateSession.mockResolvedValue({ user: null, supabaseResponse: passThroughResponse });
        const res = await middleware(makeRequest(pathname));
        expect(res).toBe(passThroughResponse);
      }
    );

    it('/shops/cafe-abc (public prefix) passes through without session', async () => {
      mockUpdateSession.mockResolvedValue({ user: null, supabaseResponse: passThroughResponse });
      const res = await middleware(makeRequest('/shops/cafe-abc'));
      expect(res).toBe(passThroughResponse);
    });

    it('/api/auth/consent (public prefix) passes through without session', async () => {
      mockUpdateSession.mockResolvedValue({ user: null, supabaseResponse: passThroughResponse });
      const res = await middleware(makeRequest('/api/auth/consent'));
      expect(res).toBe(passThroughResponse);
    });
  });

  describe('unauthenticated access to protected routes', () => {
    it('redirects to /login with returnTo when no session', async () => {
      mockUpdateSession.mockResolvedValue({ user: null, supabaseResponse: passThroughResponse });
      const res = await middleware(makeRequest('/settings'));
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/login');
      expect(location).toContain('returnTo=%2Fsettings');
    });
  });

  describe('authenticated users without PDPA consent', () => {
    it('redirects to /onboarding/consent with returnTo on protected routes', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser({ pdpa_consented: false }),
        supabaseResponse: passThroughResponse,
      });
      const res = await middleware(makeRequest('/settings'));
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/onboarding/consent');
      expect(location).toContain('returnTo=%2Fsettings');
    });

    it('/onboarding/consent itself passes through without consent', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser({ pdpa_consented: false }),
        supabaseResponse: passThroughResponse,
      });
      const res = await middleware(makeRequest('/onboarding/consent'));
      expect(res).toBe(passThroughResponse);
    });
  });

  describe('authenticated users with deletion pending', () => {
    it('redirects to /account/recover on protected routes', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser({ deletion_requested: true }),
        supabaseResponse: passThroughResponse,
      });
      const res = await middleware(makeRequest('/settings'));
      expect(res.headers.get('location')).toContain('/account/recover');
    });

    it('/account/recover itself passes through when deletion pending', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser({ deletion_requested: true }),
        supabaseResponse: passThroughResponse,
      });
      const res = await middleware(makeRequest('/account/recover'));
      expect(res).toBe(passThroughResponse);
    });

    it('/onboarding/consent redirects to /account/recover when deletion pending', async () => {
      mockUpdateSession.mockResolvedValue({
        user: makeUser({ deletion_requested: true }),
        supabaseResponse: passThroughResponse,
      });
      const res = await middleware(makeRequest('/onboarding/consent'));
      expect(res.headers.get('location')).toContain('/account/recover');
    });
  });

  describe('fully authenticated and consented users', () => {
    it('passes through to protected routes', async () => {
      const res = await middleware(makeRequest('/settings'));
      expect(res).toBe(passThroughResponse);
    });
  });
});
