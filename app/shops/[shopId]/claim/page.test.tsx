import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

import ClaimPage from './page';

describe('ClaimPage', () => {
  it('renders all required form fields', () => {
    render(<ClaimPage />);
    expect(screen.getByLabelText(/姓名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/身份/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/證明照片/i)).toBeInTheDocument();
  });

  it('disables submit button when required fields are empty', () => {
    render(<ClaimPage />);
    const submitBtn = screen.getByRole('button', { name: /送出/i });
    expect(submitBtn).toBeDisabled();
  });

  it('shows confirmation message after successful submission', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ uploadUrl: 'https://storage/upload', storagePath: 'path/to/file' }),
      })
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ claimId: 'claim-1', message: '認領申請已送出' }),
      });

    render(<ClaimPage />);
    fireEvent.change(screen.getByLabelText(/姓名/i), { target: { value: 'Alice Chen' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'alice@test.com' } });

    const fileInput = screen.getByLabelText(/證明照片/i);
    const file = new File(['photo'], 'proof.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /送出/i }));

    await waitFor(() => {
      expect(screen.getByText(/已送出/i)).toBeInTheDocument();
    });
  });
});
