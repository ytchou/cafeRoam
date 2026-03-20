import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CollapseToggle } from './collapse-toggle';

describe('a user interacting with the CollapseToggle', () => {
  it('a user sees a collapse button when the panel is expanded', () => {
    render(<CollapseToggle collapsed={false} onClick={() => {}} />);
    expect(
      screen.getByRole('button', { name: /collapse/i })
    ).toBeInTheDocument();
  });

  it('a user tapping the toggle triggers the panel to collapse or expand', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CollapseToggle collapsed={false} onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /collapse/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('a user sees an expand button when the panel is collapsed', () => {
    render(<CollapseToggle collapsed={true} onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
  });
});
