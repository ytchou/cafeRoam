import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStamp } from '@/lib/test-utils/factories';
import { CorkBoard } from './cork-board';

beforeEach(() => {
  localStorage.clear();
});

const stamps = [
  makeStamp({ id: 'stamp-1', shop_name: 'Fika Coffee' }),
  makeStamp({ id: 'stamp-2', shop_name: 'Buna Coffee' }),
];

describe('CorkBoard', () => {
  it('renders all stamp cards', () => {
    render(<CorkBoard stamps={stamps} />);
    expect(screen.getByText('Fika Coffee')).toBeInTheDocument();
    expect(screen.getByText('Buna Coffee')).toBeInTheDocument();
  });

  it('defaults to scattered view', () => {
    render(<CorkBoard stamps={stamps} />);
    expect(screen.getByTestId('scatter-view')).toBeInTheDocument();
  });

  it('switches to grid view when grid button is clicked', async () => {
    const user = userEvent.setup();
    render(<CorkBoard stamps={stamps} />);
    await user.click(screen.getByLabelText('Grid view'));
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
  });

  it('persists view preference to localStorage', async () => {
    const user = userEvent.setup();
    render(<CorkBoard stamps={stamps} />);
    await user.click(screen.getByLabelText('Grid view'));
    expect(localStorage.getItem('caferoam:memories_view')).toBe('grid');
  });

  it('restores view preference from localStorage', () => {
    localStorage.setItem('caferoam:memories_view', 'grid');
    render(<CorkBoard stamps={stamps} />);
    expect(screen.getByTestId('grid-view')).toBeInTheDocument();
  });

  it('renders push pins on cards', () => {
    render(<CorkBoard stamps={stamps} />);
    const pins = screen.getAllByTestId('push-pin');
    expect(pins.length).toBe(stamps.length);
  });

  it('renders empty state when no stamps', () => {
    render(<CorkBoard stamps={[]} />);
    expect(screen.getByText(/No memories yet/)).toBeInTheDocument();
  });
});
