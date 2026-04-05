import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('TarotEmptyState with district CTA', () => {
  it('renders "Try a different district" button when callback provided', () => {
    render(
      <TarotEmptyState
        onExpandRadius={vi.fn()}
        onTryDifferentDistrict={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /try a different district/i })
    ).toBeInTheDocument();
  });

  it('does not render district button when callback is not provided', () => {
    render(<TarotEmptyState onExpandRadius={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /try a different district/i })
    ).not.toBeInTheDocument();
  });

  it('calls onTryDifferentDistrict when district button is clicked', async () => {
    const onTry = vi.fn();
    render(
      <TarotEmptyState
        onExpandRadius={vi.fn()}
        onTryDifferentDistrict={onTry}
      />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /try a different district/i })
    );
    expect(onTry).toHaveBeenCalled();
  });

  it('hides Expand radius button in district mode (onExpandRadius not provided)', () => {
    render(<TarotEmptyState onTryDifferentDistrict={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /expand radius/i })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try a different district/i })
    ).toBeInTheDocument();
  });
});
