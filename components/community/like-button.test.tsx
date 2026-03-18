import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LikeButton } from './like-button';

describe('LikeButton', () => {
  it('displays the like count', () => {
    render(<LikeButton count={12} liked={false} onToggle={vi.fn()} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows filled heart when liked', () => {
    render(<LikeButton count={5} liked={true} onToggle={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle when tapped', () => {
    const onToggle = vi.fn();
    render(<LikeButton count={3} liked={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
