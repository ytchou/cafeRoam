import { render, screen } from '@testing-library/react';
import { FilterSheet } from './filter-sheet';

vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
      open ? <div data-testid="drawer">{children}</div> : null,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: () => <div data-testid="drawer-overlay" />,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Title: ({ children, className }: { children: React.ReactNode; className?: string }) => <h2 className={className}>{children}</h2>,
    Handle: () => <div data-testid="drawer-handle" />,
  },
}));

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
}));

describe('FilterSheet', () => {
  it('renders title when open', () => {
    render(<FilterSheet open onClose={() => {}} onApply={() => {}} initialFilters={[]} />);
    const headings = screen.getAllByText('Filters');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Clear All button', () => {
    render(<FilterSheet open onClose={() => {}} onApply={() => {}} initialFilters={[]} />);
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    render(<FilterSheet open onClose={() => {}} onApply={() => {}} initialFilters={[]} />);
    expect(screen.getByText('Functionality')).toBeInTheDocument();
  });

  it('renders apply button with count', () => {
    render(<FilterSheet open onClose={() => {}} onApply={() => {}} initialFilters={['wifi']} />);
    expect(screen.getByRole('button', { name: /show/i })).toBeInTheDocument();
  });
});
