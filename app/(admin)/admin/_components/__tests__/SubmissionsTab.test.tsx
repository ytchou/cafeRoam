import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { SubmissionsTab } from '../SubmissionsTab';
import { toast } from 'sonner';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
global.fetch = vi.fn();

const mockSubmissions = [
  { id: 'sub-1', shop_id: 'shop-1', status: 'pending', submitted_by: 'user-1', created_at: '2026-01-01', google_maps_url: 'https://maps.google.com/1' },
  { id: 'sub-2', shop_id: 'shop-2', status: 'pending_review', submitted_by: 'user-2', created_at: '2026-01-02', google_maps_url: 'https://maps.google.com/2' },
];

const defaultProps = {
  data: { recent_submissions: mockSubmissions, job_counts: {} },
  getToken: vi.fn().mockResolvedValue('test-token'),
  onRefresh: vi.fn(),
};

describe('SubmissionsTab multi-select', () => {
  it('shows a checkbox per actionable submission row', () => {
    render(<SubmissionsTab {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(mockSubmissions.length);
  });

  it('shows bulk toolbar when at least one submission is selected', () => {
    render(<SubmissionsTab {...defaultProps} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // select first submission
    expect(screen.getByText(/approve selected/i)).toBeInTheDocument();
    expect(screen.getByText(/reject selected/i)).toBeInTheDocument();
  });

  it('selects all when select-all checkbox is clicked', () => {
    render(<SubmissionsTab {...defaultProps} />);
    const selectAll = screen.getAllByRole('checkbox')[0];
    fireEvent.click(selectAll);
    const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
    rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());
  });
});

describe('SubmissionsTab bulk approve', () => {
  it('calls /api/admin/pipeline/approve-bulk and shows success toast', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approved: 2, skipped: 0, failed: [] }),
    } as Response);
    render(<SubmissionsTab {...defaultProps} />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]); // select all
    fireEvent.click(screen.getByText(/approve selected/i));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/pipeline/approve-bulk',
        expect.objectContaining({ method: 'POST' })
      );
      expect(toast.success).toHaveBeenCalledWith('2 submission(s) approved');
    });
  });
});
