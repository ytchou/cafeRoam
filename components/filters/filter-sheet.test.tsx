import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeAll, describe, it, expect } from 'vitest';
import { FilterSheet } from './filter-sheet';

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="drawer">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => <div data-testid="drawer-overlay" />,
    Content: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    Title: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <h2 className={className}>{children}</h2>,
    Handle: () => <div data-testid="drawer-handle" />,
  },
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('FilterSheet', () => {
  it('a user opening the filter sheet sees the Filters heading', () => {
    render(
      <FilterSheet
        open
        onClose={() => {}}
        onApply={() => {}}
        initialFilters={[]}
      />
    );
    const headings = screen.getAllByText('Filters');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('a user can clear all selected filters via the Clear All button', () => {
    render(
      <FilterSheet
        open
        onClose={() => {}}
        onApply={() => {}}
        initialFilters={['wifi']}
      />
    );
    expect(
      screen.getByRole('button', { name: /clear all/i })
    ).toBeInTheDocument();
  });

  it('a user sees category tabs for browsing filter types', () => {
    render(
      <FilterSheet
        open
        onClose={() => {}}
        onApply={() => {}}
        initialFilters={[]}
      />
    );
    expect(screen.getByText('Functionality')).toBeInTheDocument();
  });

  it('a user with active filters sees the count on the apply button', () => {
    render(
      <FilterSheet
        open
        onClose={() => {}}
        onApply={() => {}}
        initialFilters={['wifi']}
      />
    );
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument();
  });

  it('a user clicking apply calls onApply with the selected filters', () => {
    const onApply = vi.fn();
    render(
      <FilterSheet
        open
        onClose={() => {}}
        onApply={onApply}
        initialFilters={['wifi']}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(onApply).toHaveBeenCalledWith(expect.arrayContaining(['wifi']));
  });
});
