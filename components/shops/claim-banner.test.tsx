import { render, screen } from '@testing-library/react';
import { ClaimBanner } from './claim-banner';

describe('ClaimBanner', () => {
  it('shows claim prompt with a link for shop owners', () => {
    render(
      <ClaimBanner shopId="rufous-coffee-da-an" shopName="Rufous Coffee" />
    );
    expect(screen.getByText(/Is this your café/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Claim this page/i })
    ).toBeInTheDocument();
  });
});
