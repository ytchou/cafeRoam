import { render, screen } from '@testing-library/react';
import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  it('renders input with explicit dark text color', () => {
    render(<SearchBar onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass('text-gray-900');
  });

  it('renders placeholder with muted color', () => {
    render(<SearchBar onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toHaveClass(
      'placeholder:text-gray-400'
    );
  });
});
