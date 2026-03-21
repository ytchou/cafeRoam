import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotSpread } from './tarot-spread';
import type { TarotCardData } from '@/types/tarot';

vi.mock('@/lib/hooks/use-media-query', () => ({
  useIsDesktop: vi.fn(() => false),
  useMediaQuery: vi.fn(() => false),
}));

// Mock analytics
vi.mock('@/lib/posthog/use-analytics', () => ({
  useAnalytics: () => ({ capture: vi.fn() }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the drawer to avoid portal issues
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

const mockCards: TarotCardData[] = [
  {
    shopId: 's1',
    tarotTitle: "The Scholar's Refuge",
    flavorText: 'Quiet in a noisy world.',
    isOpenNow: true,
    distanceKm: 1.2,
    name: '森日咖啡',
    neighborhood: '台北市',
    coverPhotoUrl: null,
    rating: 4.5,
    reviewCount: 100,
    slug: 'sen-ri',
  },
  {
    shopId: 's2',
    tarotTitle: 'The Hidden Alcove',
    flavorText: 'A secret worth keeping.',
    isOpenNow: true,
    distanceKm: 2.0,
    name: '秘密基地',
    neighborhood: '台北市',
    coverPhotoUrl: null,
    rating: 4.3,
    reviewCount: 80,
    slug: 'mi-mi',
  },
  {
    shopId: 's3',
    tarotTitle: "The Alchemist's Table",
    flavorText: 'Transformation in every cup.',
    isOpenNow: true,
    distanceKm: 0.5,
    name: '煉金術師',
    neighborhood: '台北市',
    coverPhotoUrl: null,
    rating: 4.8,
    reviewCount: 200,
    slug: 'lian-jin',
  },
];

describe('TarotSpread', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('renders 3 face-down cards with titles', () => {
    render(<TarotSpread cards={mockCards} onDrawAgain={vi.fn()} />);
    expect(screen.getByText(/The Scholar's Refuge/)).toBeInTheDocument();
    expect(screen.getByText(/The Hidden Alcove/)).toBeInTheDocument();
    expect(screen.getByText(/The Alchemist's Table/)).toBeInTheDocument();
  });

  it('shows instruction text', () => {
    render(<TarotSpread cards={mockCards} onDrawAgain={vi.fn()} />);
    expect(screen.getByText(/Tap a card to reveal/i)).toBeInTheDocument();
  });

  it('opens reveal drawer when a card is tapped', () => {
    render(<TarotSpread cards={mockCards} onDrawAgain={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    // First 3 buttons are the cards
    fireEvent.click(buttons[0]);
    // After clicking, the drawer should open with shop name
    expect(screen.getByText('森日咖啡')).toBeInTheDocument();
  });

  it('renders single card when only 1 available', () => {
    render(<TarotSpread cards={[mockCards[0]]} onDrawAgain={vi.fn()} />);
    expect(screen.getByText(/The Scholar's Refuge/)).toBeInTheDocument();
    expect(screen.queryByText(/The Hidden Alcove/)).not.toBeInTheDocument();
  });
});
