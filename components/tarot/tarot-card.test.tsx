import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TarotCard } from './tarot-card';

describe('TarotCard', () => {
  const defaultProps = {
    title: "The Scholar's Refuge",
    isRevealed: false,
    onTap: vi.fn(),
  };

  it('displays the tarot title', () => {
    render(<TarotCard {...defaultProps} />);
    expect(screen.getByText("The Scholar's Refuge")).toBeInTheDocument();
  });

  it('calls onTap when clicked', () => {
    const onTap = vi.fn();
    render(<TarotCard {...defaultProps} onTap={onTap} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('shows revealed badge when isRevealed is true', () => {
    render(<TarotCard {...defaultProps} isRevealed={true} />);
    expect(screen.getByText('✓ Revealed')).toBeInTheDocument();
  });

  it('does not show revealed badge when isRevealed is false', () => {
    render(<TarotCard {...defaultProps} isRevealed={false} />);
    expect(screen.queryByText('✓ Revealed')).not.toBeInTheDocument();
  });

  it('is still clickable when revealed', () => {
    const onTap = vi.fn();
    render(<TarotCard {...defaultProps} isRevealed={true} onTap={onTap} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
