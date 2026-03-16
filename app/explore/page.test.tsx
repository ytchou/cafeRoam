import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExplorePage from './page';

describe('Explore page', () => {
  it('When a user taps the Explore tab, the page renders without crashing', () => {
    render(<ExplorePage />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
