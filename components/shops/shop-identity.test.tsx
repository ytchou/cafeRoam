import { render, screen } from '@testing-library/react';
import { ShopIdentity } from './shop-identity';
import { RatingBadge } from './rating-badge';
import { vi } from 'vitest';

vi.mock('./rating-badge', () => ({
  RatingBadge: vi.fn(({ rating, reviewCount }) => (
    <div data-testid="rating-badge">
      {rating} ({reviewCount})
    </div>
  )),
}));

describe('ShopIdentity', () => {
  const base = { name: 'The Brew House', rating: 4.8, reviewCount: 1263 };

  it('shows the shop name', () => {
    render(<ShopIdentity {...base} />);
    expect(
      screen.getByRole('heading', { name: /The Brew House/i })
    ).toBeInTheDocument();
  });

  it('shows rating and review count', () => {
    render(<ShopIdentity {...base} />);
    expect(screen.getByTestId('rating-badge')).toBeInTheDocument();
  });

  it('shows "Open" badge when openNow is true', () => {
    render(<ShopIdentity {...base} openNow={true} />);
    expect(screen.getByText(/Open/i)).toBeInTheDocument();
  });

  it('shows "Closed" badge when openNow is false', () => {
    render(<ShopIdentity {...base} openNow={false} />);
    expect(screen.getByText(/Closed/i)).toBeInTheDocument();
  });

  it('shows distance when provided', () => {
    render(<ShopIdentity {...base} distance="0.3 km" />);
    expect(screen.getByText(/0\.3 km/)).toBeInTheDocument();
  });

  it('shows address when provided', () => {
    render(<ShopIdentity {...base} address="Yongkang St, Da'an District" />);
    expect(screen.getByText(/Yongkang St/i)).toBeInTheDocument();
  });
});

describe('ShopIdentity with RatingBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RatingBadge with rating and reviewCount props', () => {
    render(
      <ShopIdentity name="Test Cafe" rating={4.5} reviewCount={100} />
    );

    const callProps = (RatingBadge as any).mock.calls[0][0];
    expect(callProps.rating).toBe(4.5);
    expect(callProps.reviewCount).toBe(100);
    expect(screen.getByTestId('rating-badge')).toBeInTheDocument();
  });

  it('passes null rating to RatingBadge when no rating provided', () => {
    render(<ShopIdentity name="Test Cafe" />);

    const callProps = (RatingBadge as any).mock.calls[0][0];
    expect(callProps.rating).toBeUndefined();
    expect(callProps.reviewCount).toBeUndefined();
  });
});
