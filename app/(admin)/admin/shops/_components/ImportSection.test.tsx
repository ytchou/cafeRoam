import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ImportSection } from './ImportSection';

const mockGetToken = vi.fn();
const mockOnImportComplete = vi.fn();

function renderImportSection() {
  return render(
    <ImportSection
      getToken={mockGetToken}
      onImportComplete={mockOnImportComplete}
    />
  );
}

function createCsvFile() {
  return new File(
    ['name,google_maps_url\nTest Cafe,https://maps.google.com/?cid=123'],
    'shops.csv',
    { type: 'text/csv' }
  );
}

describe('ImportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue('test-token-abc');
  });

  it('renders Seed Shops button and Run Pipeline button', () => {
    renderImportSection();

    expect(
      screen.getByRole('button', { name: /seed shops/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /run pipeline/i })
    ).toBeInTheDocument();
  });

  it('shows error toast and does not call fetch when no file is selected', async () => {
    const user = userEvent.setup();
    renderImportSection();

    await user.click(screen.getByRole('button', { name: /seed shops/i }));

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it('does not call fetch when session token is missing', async () => {
    mockGetToken.mockResolvedValue(null);

    const user = userEvent.setup();
    renderImportSection();

    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    await user.upload(fileInput, createCsvFile());
    await user.click(screen.getByRole('button', { name: /seed shops/i }));

    await waitFor(() => {
      expect(mockGetToken).toHaveBeenCalled();
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it('calls manual-csv endpoint with FormData and auth header on success, shows summary card', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        imported: 5,
        skipped_duplicate: 1,
        invalid_url: 0,
        duplicate_in_file: 0,
        total: 6,
      }),
    });

    const user = userEvent.setup();
    renderImportSection();

    const fileInput = document.getElementById('csv-file') as HTMLInputElement;
    await user.upload(fileInput, createCsvFile());
    await user.click(screen.getByRole('button', { name: /seed shops/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/shops/import/manual-csv',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-token-abc',
          },
          body: expect.any(FormData),
        })
      );
    });

    expect(await screen.findByText('Imported: 5')).toBeInTheDocument();
    expect(screen.getByText('Skipped (duplicate in DB): 1')).toBeInTheDocument();
    expect(screen.getByText('Skipped (duplicate in file): 0')).toBeInTheDocument();
    expect(screen.getByText('Invalid URL: 0')).toBeInTheDocument();
    expect(screen.getByText('Total: 6')).toBeInTheDocument();
    expect(mockOnImportComplete).toHaveBeenCalledTimes(1);
  });

  it('calls run-batch endpoint with auth header and shows queued toast on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ queued: true }),
    });

    const user = userEvent.setup();
    renderImportSection();

    await user.click(screen.getByRole('button', { name: /run pipeline/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/pipeline/run-batch',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-abc',
          },
        }
      );
    });

    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });
});
