/**
 * Shared mock helpers for frontend tests.
 *
 * Usage: call the helper to get mock references, then use them in your vi.mock() call.
 *
 * @example
 * import { createMockSupabaseAuth, createMockRouter } from '@/lib/test-utils/mocks';
 *
 * const mockAuth = createMockSupabaseAuth();
 * vi.mock('@/lib/supabase/client', () => ({
 *   createClient: () => ({ auth: mockAuth }),
 * }));
 *
 * const mockRouter = createMockRouter();
 * vi.mock('next/navigation', () => ({
 *   useRouter: () => mockRouter,
 *   useSearchParams: () => new URLSearchParams(),
 * }));
 */
import { vi } from 'vitest';

export function createMockSupabaseAuth() {
  return {
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    refreshSession: vi
      .fn()
      .mockResolvedValue({ data: { session: {} }, error: null }),
  };
}

export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };
}
