import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoginPage />);
    expect(container).toBeTruthy();
  });
});
