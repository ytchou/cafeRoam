import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchBar } from './search-bar';

describe('a user interacting with the SearchBar', () => {
  it('a user sees a search input with placeholder text guiding them to search coffee shops', () => {
    render(<SearchBar onSearch={() => {}} onFilterClick={() => {}} />);
    expect(
      screen.getByPlaceholderText('Search coffee shops...')
    ).toBeInTheDocument();
  });

  it('a user sees a filter button to open advanced filtering options', () => {
    render(<SearchBar onSearch={() => {}} onFilterClick={() => {}} />);
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('a user typing a query and submitting triggers a search', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} onFilterClick={() => {}} />);
    const input = screen.getByPlaceholderText('Search coffee shops...');
    await user.type(input, 'latte art');
    fireEvent.submit(input.closest('form')!);
    expect(onSearch).toHaveBeenCalledWith('latte art');
  });

  it('a user clearing the search bar and submitting clears active search results', async () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} onFilterClick={() => {}} />);
    fireEvent.submit(
      screen.getByPlaceholderText('Search coffee shops...').closest('form')!
    );
    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('a user tapping the filter button opens the filter panel', async () => {
    const user = userEvent.setup();
    const onFilterClick = vi.fn();
    render(<SearchBar onSearch={() => {}} onFilterClick={onFilterClick} />);
    await user.click(screen.getByRole('button', { name: /filter/i }));
    expect(onFilterClick).toHaveBeenCalledOnce();
  });

  it('a user returning to a previous search sees their prior query pre-filled', () => {
    render(
      <SearchBar
        onSearch={() => {}}
        onFilterClick={() => {}}
        defaultQuery="mocha"
      />
    );
    expect(screen.getByDisplayValue('mocha')).toBeInTheDocument();
  });

  it('given a search is in flight, the input is disabled and 搜尋中… text is visible', () => {
    render(
      <SearchBar
        onSearch={() => {}}
        onFilterClick={() => {}}
        isSearching={true}
      />
    );
    expect(screen.getByPlaceholderText('Search coffee shops...')).toBeDisabled();
    expect(screen.getByText('搜尋中…')).toBeVisible();
  });
});
