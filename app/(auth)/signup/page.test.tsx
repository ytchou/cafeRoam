import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SignupPage from './page';

describe('SignupPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<SignupPage />);
    expect(container).toBeTruthy();
  });
});
