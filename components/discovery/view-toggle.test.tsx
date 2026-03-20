import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ViewToggle } from './view-toggle';

describe('ViewToggle', () => {
  it('renders map and list buttons', () => {
    render(<ViewToggle view="map" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /map/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list/i })).toBeInTheDocument();
  });

  it('shows map button as active when view is map', () => {
    render(<ViewToggle view="map" onChange={() => {}} />);
    const mapBtn = screen.getByRole('button', { name: /map/i });
    expect(mapBtn).toHaveAttribute('data-active', 'true');
  });

  it('calls onChange with list when list button clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle view="map" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /list/i }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('does not call onChange when clicking already active view', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewToggle view="map" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /map/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
