import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClaimBanner } from './claim-banner';

describe('ClaimBanner', () => {
  it('renders a link to the claim page when shop is unclaimed', () => {
    render(<ClaimBanner shopId="shop-1" shopName="Test Cafe" claimStatus={null} />);
    const link = screen.getByRole('link', { name: /claim this page/i });
    expect(link).toHaveAttribute('href', '/shops/shop-1/claim');
  });

  it('shows pending message when claim is pending', () => {
    render(<ClaimBanner shopId="shop-1" shopName="Test Cafe" claimStatus="pending" />);
    expect(screen.getByText(/審核中/i)).toBeInTheDocument();
  });

  it('renders nothing when shop is approved', () => {
    const { container } = render(
      <ClaimBanner shopId="shop-1" shopName="Test Cafe" claimStatus="approved" />
    );
    expect(container.firstChild).toBeNull();
  });
});
