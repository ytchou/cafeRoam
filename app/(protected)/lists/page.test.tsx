import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ListsPage from './page';

describe('ListsPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<ListsPage />);
    expect(container).toBeTruthy();
  });
});
