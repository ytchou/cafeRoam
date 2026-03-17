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

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

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

  it("shows Let's Go button that navigates to shop", () => {
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
      '/shops/s1/sen-ri'
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
});
