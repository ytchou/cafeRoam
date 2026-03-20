// components/shops/claim-banner.test.tsx
import { render, screen } from '@testing-library/react';
import { ClaimBanner } from './claim-banner';

describe('ClaimBanner', () => {
  it('shows claim prompt with a link for shop owners', () => {
    render(<ClaimBanner shopId="abc123" />);
    expect(screen.getByText(/Is this your café/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Claim this page/i })).toBeInTheDocument();
  });
});
