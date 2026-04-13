import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders without crashing', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container).toBeTruthy();
  });

  it('renders with variant', () => {
    const { getByRole } = render(<Button variant="destructive">Delete</Button>);
    expect(getByRole('button')).toBeTruthy();
  });
});

describe('Button loading state', () => {
  it('when a user submits a form, the button stays disabled and shows loading text', () => {
    render(
      <Button loading loadingText="Submitting..." aria-label="Save profile">
        Save
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Save profile' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveTextContent('Submitting...');
    expect(btn).not.toHaveTextContent(/^Save$/);
  });

  it('falls back to original children when loadingText is not provided', () => {
    render(
      <Button loading aria-label="Save">
        Save
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveTextContent('Save');
  });

  it('when not loading, aria-busy is absent and button is interactive', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    expect(btn).not.toBeDisabled();
    expect(btn).not.toHaveAttribute('aria-busy');
  });

  it('preserves asChild path without breaking Slot composition', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );
    expect(screen.getByRole('link', { name: 'Link' })).toBeInTheDocument();
  });
});
