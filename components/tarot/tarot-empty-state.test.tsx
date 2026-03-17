import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotEmptyState } from './tarot-empty-state';

describe('TarotEmptyState', () => {
  it('shows empty state message', () => {
    render(<TarotEmptyState onExpandRadius={vi.fn()} />);
    expect(screen.getByText(/No cafes open nearby/i)).toBeInTheDocument();
  });

  it('has an Expand Radius button', () => {
    const onExpand = vi.fn();
    render(<TarotEmptyState onExpandRadius={onExpand} />);
    fireEvent.click(screen.getByText(/Expand radius/i));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
