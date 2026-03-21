import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotRevealDrawer } from './tarot-reveal-drawer';
import type { TarotCardData } from '@/types/tarot';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock analytics
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

// Mock useIsDesktop
vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DrawerContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  DrawerTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open: boolean;
  }) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
}));

import { useIsDesktop } from '@/lib/hooks/use-media-query';

const mockCard: TarotCardData = {
  shopId: 's1',
  tarotTitle: "The Scholar's Refuge",
  flavorText: 'For those who seek quiet.',
  isOpenNow: true,
  distanceKm: 1.2,
  name: '森日咖啡',
  neighborhood: '台北市',
  coverPhotoUrl: 'https://example.com/photo.jpg',
  rating: 4.5,
  reviewCount: 142,
  slug: 'sen-ri',
};

describe('TarotRevealDrawer', () => {
  it('displays shop name when open', () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByText('森日咖啡')).toBeInTheDocument();
  });

  it('displays tarot title', () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByText("The Scholar's Refuge")).toBeInTheDocument();
  });

  it('displays flavor text', () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByText(/For those who seek quiet/)).toBeInTheDocument();
  });

  it("shows Let's Go link that navigates to shop", () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByRole('link', { name: /Let's Go/i })).toHaveAttribute(
      'href',
      '/shops/sen-ri'
    );
  });

  it('calls onDrawAgain when Draw Again is clicked', () => {
    const onDrawAgain = vi.fn();
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={onDrawAgain}
      />
    );
    fireEvent.click(screen.getByText(/Draw Again/i));
    expect(onDrawAgain).toHaveBeenCalledTimes(1);
  });

  it('renders Tarot Card label', () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByText('Tarot Card')).toBeInTheDocument();
  });

  it('renders close button that calls onClose', () => {
    const onClose = vi.fn();
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={onClose}
        onDrawAgain={vi.fn()}
      />
    );
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Back to cards and Draw Again footer', () => {
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByText(/Back to cards/)).toBeInTheDocument();
    expect(screen.getByText(/Draw Again/)).toBeInTheDocument();
  });

  it('renders as Dialog on desktop', () => {
    vi.mocked(useIsDesktop).mockReturnValue(true);
    render(
      <TarotRevealDrawer
        card={mockCard}
        open={true}
        onClose={vi.fn()}
        onDrawAgain={vi.fn()}
      />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    vi.mocked(useIsDesktop).mockReturnValue(false);
  });
});
