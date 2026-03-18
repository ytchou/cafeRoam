import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="drawer">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => <div data-testid="overlay" />,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drawer-content">{children}</div>
    ),
    Handle: () => <div data-testid="drawer-handle" />,
    Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  },
}));

import { FilterSheet } from './filter-sheet';

describe('FilterSheet', () => {
  it('renders 5 category tabs', () => {
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={vi.fn()} initialFilters={[]} />
    );
    expect(screen.getByRole('tab', { name: /functionality/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /time/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ambience/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /mode/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /food/i })).toBeInTheDocument();
  });

  it('shows tag chips for the active Functionality tab', () => {
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={vi.fn()} initialFilters={[]} />
    );
    expect(screen.getByRole('button', { name: /wifi/i })).toBeInTheDocument();
  });

  it('searching filters visible tag chips across all tabs', async () => {
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={vi.fn()} initialFilters={[]} />
    );
    const searchInput = screen.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'matcha');
    // matcha is in Food tab — should surface regardless of active tab
    expect(screen.getByRole('button', { name: /matcha/i })).toBeInTheDocument();
    // wifi should not be visible when searching matcha
    expect(screen.queryByRole('button', { name: /^wifi$/i })).not.toBeInTheDocument();
  });

  it('clicking a tag chip toggles it as selected', async () => {
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={vi.fn()} initialFilters={[]} />
    );
    const wifiChip = screen.getByRole('button', { name: /wifi/i });
    await userEvent.click(wifiChip);
    expect(wifiChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking apply fires onApply with selected tag IDs', async () => {
    const onApply = vi.fn();
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={onApply} initialFilters={[]} />
    );
    await userEvent.click(screen.getByRole('button', { name: /wifi/i }));
    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(onApply).toHaveBeenCalledWith(['wifi']);
  });

  it('clicking Clear All resets all selections', async () => {
    const onApply = vi.fn();
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={onApply} initialFilters={['wifi']} />
    );
    await userEvent.click(screen.getByRole('button', { name: /clear all/i }));
    await userEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(onApply).toHaveBeenCalledWith([]);
  });

  it('shows selected count badge when filters are active', () => {
    render(
      <FilterSheet open={true} onClose={vi.fn()} onApply={vi.fn()} initialFilters={['wifi', 'outlet']} />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
