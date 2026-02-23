import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProfilePage from './page';

describe('ProfilePage', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProfilePage />);
    expect(container).toBeTruthy();
  });
});
