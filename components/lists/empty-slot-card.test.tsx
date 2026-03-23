import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { EmptySlotCard } from './empty-slot-card';

describe('EmptySlotCard', () => {
  it('a user sees the remaining slot count', () => {
    render(<EmptySlotCard remainingSlots={1} onClick={() => {}} />);
    expect(screen.getByText('1 slot remaining')).toBeInTheDocument();
  });

  it('a user sees the create prompt text', () => {
    render(<EmptySlotCard remainingSlots={2} onClick={() => {}} />);
    expect(screen.getByText('Create a new list')).toBeInTheDocument();
  });

  it('a user clicking the card triggers the onClick callback', async () => {
    const onClick = vi.fn();
    render(<EmptySlotCard remainingSlots={1} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
