import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FilterTag } from './filter-tag';

describe('a user interacting with the FilterTag', () => {
  it('a user sees the filter label on the tag', () => {
    render(<FilterTag label="WiFi" onClick={() => {}} />);
    expect(screen.getByText('WiFi')).toBeInTheDocument();
  });

  it('a user sees the filter tag as unselected by default', () => {
    render(<FilterTag label="WiFi" onClick={() => {}} />);
    const button = screen.getByRole('button', { name: /wifi/i });
    expect(button).not.toHaveAttribute('data-active');
  });

  it('a user sees the filter tag as selected when it is active', () => {
    render(<FilterTag label="WiFi" active onClick={() => {}} />);
    const button = screen.getByRole('button', { name: /wifi/i });
    expect(button).toHaveAttribute('data-active', 'true');
  });

  it('a user tapping a filter tag applies that filter', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FilterTag label="WiFi" onClick={onClick} />);
    await user.click(screen.getByRole('button', { name: /wifi/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('a user sees an icon alongside the filter label when one is provided', () => {
    const TestIcon = () => <svg data-testid="test-icon" />;
    render(
      <FilterTag
        label="WiFi"
        icon={TestIcon as unknown as import('lucide-react').LucideIcon}
        onClick={() => {}}
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('a user sees a colored dot on the Open Now filter tag', () => {
    render(<FilterTag label="Open Now" dot="#3D8A5A" onClick={() => {}} />);
    expect(screen.getByTestId('filter-tag-dot')).toBeInTheDocument();
  });
});
