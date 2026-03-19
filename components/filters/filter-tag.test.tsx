import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FilterTag } from './filter-tag';

describe('FilterTag', () => {
  it('renders label text', () => {
    render(<FilterTag label="WiFi" onClick={() => {}} />);
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('appears unselected by default', () => {
    render(<FilterTag label="WiFi" onClick={() => {}} />);
    const button = screen.getByRole('button', { name: /wifi/i });
    expect(button).not.toHaveAttribute('data-active');
  });

  it('appears selected when the active prop is true', () => {
    render(<FilterTag label="WiFi" active onClick={() => {}} />);
    const button = screen.getByRole('button', { name: /wifi/i });
    expect(button).toHaveAttribute('data-active', 'true');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FilterTag label="WiFi" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /wifi/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders icon when icon prop provided', () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(<FilterTag label="WiFi" icon={TestIcon as unknown as import('lucide-react').LucideIcon} onClick={() => {}} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders green dot when dot prop is provided', () => {
    render(<FilterTag label="Open Now" dot="#3D8A5A" onClick={() => {}} />);
    expect(screen.getByTestId('filter-tag-dot')).toBeInTheDocument();
  });
});
