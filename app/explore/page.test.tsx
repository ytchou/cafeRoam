import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExplorePage from './page';

describe('Explore page', () => {
  it('When a user opens the Explore tab, they see the explore section', () => {
    render(<ExplorePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
