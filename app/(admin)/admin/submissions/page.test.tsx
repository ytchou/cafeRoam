import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubmissionsPage from './page';

// Mock the auth hook
vi.mock('../_hooks/use-admin-auth', () => ({
  useAdminAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
}));

// Mock fetch to avoid real network calls
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ submissions: [], job_counts: {}, recent_submissions: [] }),
  } as unknown as Response);
});

describe('SubmissionsPage', () => {
  it('renders without crashing', () => {
    render(<SubmissionsPage />);
    // Page renders — SubmissionsTab content will show loading state
    expect(document.body).toBeTruthy();
  });
});
