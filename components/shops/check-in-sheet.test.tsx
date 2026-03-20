import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CheckInSheet } from './check-in-sheet';

vi.mock('@/components/checkins/photo-uploader', () => ({
  PhotoUploader: ({ onChange }: { onChange: (files: File[]) => void }) => (
    <button onClick={() => onChange([new File([''], 'photo.jpg', { type: 'image/jpeg' })])}>
      Add Photo
    </button>
  ),
}));

vi.mock('@/lib/supabase/storage', () => ({
  uploadCheckInPhoto: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
}));

global.fetch = vi.fn();

describe('CheckInSheet', () => {
  const defaultProps = {
    shopId: 'simple-kaffa-da-an',
    shopName: 'Simple Kaffa',
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  it('shows the shop name in the sheet header', () => {
    render(<CheckInSheet {...defaultProps} />);
    expect(screen.getByText('Simple Kaffa')).toBeInTheDocument();
  });

  it('disables submit when no photo is selected', () => {
    render(<CheckInSheet {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: /Check In/i });
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit after a photo is added', async () => {
    render(<CheckInSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Photo'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Check In/i })).not.toBeDisabled();
    });
  });

  it('calls POST /api/checkins on submit and fires onSuccess', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'ci-1' }),
    });
    render(<CheckInSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Photo'));
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Check In/i })));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/checkins', expect.objectContaining({ method: 'POST' }));
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it('shows an error message when the API call fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });
    render(<CheckInSheet {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Photo'));
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /Check In/i })));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
