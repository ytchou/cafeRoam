import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubmissionsPage from './page';

// Mock the auth hook
vi.mock('../_hooks/use-admin-auth', () => ({
  useAdminAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
}));

// Mock fetch to avoid real network calls
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      submissions: [],
      job_counts: {},
      recent_submissions: [],
    }),
  } as unknown as Response);
});

describe('SubmissionsPage', () => {
  it('shows a loading indicator while fetching overview data', () => {
    render(<SubmissionsPage />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });
});
