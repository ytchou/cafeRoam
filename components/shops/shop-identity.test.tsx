import { render, screen } from '@testing-library/react';
import { ShopIdentity } from './shop-identity';

describe('ShopIdentity', () => {
  const base = { name: 'The Brew House', rating: 4.8, reviewCount: 1263 };

  it('shows the shop name', () => {
    render(<ShopIdentity {...base} />);
    expect(
      screen.getByRole('heading', { name: /The Brew House/i })
    ).toBeInTheDocument();
  });

  it('shows rating and review count when provided', () => {
    render(<ShopIdentity {...base} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText(/1263 reviews/i)).toBeInTheDocument();
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

  it('shows community summary tagline when provided', () => {
    render(
      <ShopIdentity
        {...base}
        communitySummary="顧客推薦拿鐵和巴斯克蛋糕，環境安靜適合工作。"
      />
    );
    expect(screen.getByText(/顧客推薦拿鐵/)).toBeInTheDocument();
  });

  it('does not show community summary when not provided', () => {
    render(<ShopIdentity {...base} />);
    expect(screen.queryByText(/顧客推薦/)).not.toBeInTheDocument();
  });

  it('hides rating badge when no rating or review count provided', () => {
    render(<ShopIdentity name="Test Cafe" />);
    expect(screen.queryByText(/reviews/i)).not.toBeInTheDocument();
  });

  it('shows rating badge with correct stars for 4.5 rating', () => {
    render(<ShopIdentity name="Test Cafe" rating={4.5} reviewCount={100} />);
    const stars = screen.getAllByTestId('star-icon');
    expect(stars).toHaveLength(5);
    // 4.5 rounds to 5 filled stars
    const filledStars = stars.filter(
      (star) => star.getAttribute('data-filled') === 'true'
    );
    expect(filledStars).toHaveLength(5);
  });
});
