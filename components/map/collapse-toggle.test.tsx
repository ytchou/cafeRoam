import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CollapseToggle } from './collapse-toggle';

describe('CollapseToggle', () => {
  it('renders a button', () => {
    render(<CollapseToggle collapsed={false} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CollapseToggle collapsed={false} onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows expand label when collapsed', () => {
    render(<CollapseToggle collapsed={true} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });
});
