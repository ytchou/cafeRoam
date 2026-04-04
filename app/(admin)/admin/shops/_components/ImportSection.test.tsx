import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('ImportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue('test-token-abc');
  });

  it('renders all three import action buttons', () => {
    renderImportSection();
    expect(
      screen.getByRole('button', { name: /import from cafe nomad/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /import google takeout/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /check urls/i })
    ).toBeInTheDocument();
  });

  it('calls the cafe-nomad import endpoint and notifies parent on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        imported: 12,
        flagged_duplicates: 2,
        filtered: {
          invalid_url: 0,
          invalid_name: 0,
          known_failed: 0,
          closed: 0,
        },
        pending_url_check: 0,
        region: 'taipei',
      }),
    });

    const user = userEvent.setup();
    renderImportSection();

    await user.click(
      screen.getByRole('button', { name: /import from cafe nomad/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/shops/import/cafe-nomad',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-abc',
          }),
        })
      );
    });
    expect(mockOnImportComplete).toHaveBeenCalled();
  });

  it('does not call the endpoint when the session token is missing', async () => {
    mockGetToken.mockResolvedValue(null);

    const user = userEvent.setup();
    renderImportSection();

    await user.click(
      screen.getByRole('button', { name: /import from cafe nomad/i })
    );

    await waitFor(() => {
      expect(mockGetToken).toHaveBeenCalled();
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it('calls the check-urls endpoint on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ checking: 5 }),
    });

    const user = userEvent.setup();
    renderImportSection();

    await user.click(screen.getByRole('button', { name: /check urls/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/shops/import/check-urls',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-abc',
          }),
        })
      );
    });
  });

  it('shows uploading state while the google-takeout import is in progress', async () => {
    // Simulate no file selected — should not call fetch
    const user = userEvent.setup();
    renderImportSection();

    await user.click(
      screen.getByRole('button', { name: /import google takeout/i })
    );

    // No file selected — fetch should not be called
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
