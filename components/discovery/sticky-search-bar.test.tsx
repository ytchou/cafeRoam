import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StickySearchBar } from './sticky-search-bar';

describe('StickySearchBar', () => {
  it('submits the query typed by the user', async () => {
    const onSubmit = vi.fn();
    render(<StickySearchBar onSubmit={onSubmit} onFilterClick={vi.fn()} />);
    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'pour over{enter}');
    expect(onSubmit).toHaveBeenCalledWith('pour over');
  });

  it('prefills from defaultQuery', () => {
    render(
      <StickySearchBar
        defaultQuery="flat white"
        onSubmit={vi.fn()}
        onFilterClick={vi.fn()}
      />
    );
    expect(screen.getByRole('searchbox')).toHaveValue('flat white');
  });

  it('calls onFilterClick when filter button pressed', async () => {
    const onFilterClick = vi.fn();
    render(
      <StickySearchBar onSubmit={vi.fn()} onFilterClick={onFilterClick} />
    );
    await userEvent.click(screen.getByRole('button', { name: /篩選|filter/i }));
    expect(onFilterClick).toHaveBeenCalled();
  });
});
