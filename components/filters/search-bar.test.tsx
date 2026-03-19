import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  it('renders placeholder text', () => {
    render(<SearchBar onSearch={() => {}} onFilterClick={() => {}} />);
    expect(screen.getByPlaceholderText('Search coffee shops...')).toBeInTheDocument();
  });

  it('renders filter button', () => {
    render(<SearchBar onSearch={() => {}} onFilterClick={() => {}} />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('calls onSearch when form submitted', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} onFilterClick={() => {}} />);
    const input = screen.getByPlaceholderText('Search coffee shops...');
    await user.type(input, 'latte art');
    fireEvent.submit(input.closest('form')!);
    expect(onSearch).toHaveBeenCalledWith('latte art');
  });

  it('does not submit empty search', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} onFilterClick={() => {}} />);
    fireEvent.submit(screen.getByPlaceholderText('Search coffee shops...').closest('form')!);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('calls onFilterClick when filter button clicked', async () => {
    const user = userEvent.setup();
    const onFilterClick = vi.fn();
    render(<SearchBar onSearch={() => {}} onFilterClick={onFilterClick} />);
    await user.click(screen.getByRole('button', { name: /filter/i }));
    expect(onFilterClick).toHaveBeenCalledOnce();
  });

  it('pre-fills with defaultQuery', () => {
    render(<SearchBar onSearch={() => {}} onFilterClick={() => {}} defaultQuery="mocha" />);
    expect(screen.getByDisplayValue('mocha')).toBeInTheDocument();
  });
});
