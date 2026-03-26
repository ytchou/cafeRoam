import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useParams: () => ({ shopId: 'shop-1' }),
  useRouter: () => ({ push: vi.fn() }),
  redirect: vi.fn(),
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

import ClaimPage from './page';

describe('ClaimPage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('renders all required form fields', () => {
    render(<ClaimPage />);
    expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/身份/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/證明照片/i)).toBeInTheDocument();
  });

  it('disables submit button when required fields are empty', () => {
    render(<ClaimPage />);
    expect(screen.getByRole('button', { name: /送出/i })).toBeDisabled();
  });

  it('shows confirmation message after successful submission', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploadUrl: 'https://storage/upload', storagePath: 'path/to/file' }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimId: 'claim-1', message: '認領申請已送出' }),
      });

    render(<ClaimPage />);

    await userEvent.type(screen.getByLabelText(/姓名/i), 'Alice Chen');
    await userEvent.type(screen.getByLabelText(/Email/i), 'alice@test.com');
    await userEvent.upload(screen.getByLabelText(/證明照片/i), new File(['photo'], 'proof.jpg', { type: 'image/jpeg' }));

    await userEvent.click(screen.getByRole('button', { name: /送出/i }));

    await waitFor(() => {
      expect(screen.getByText(/已送出/i)).toBeInTheDocument();
    });
  });
});
