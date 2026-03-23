import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProfileHeader } from './profile-header';

describe('ProfileHeader', () => {
  const defaultProps = {
    displayName: 'Mei-Ling',
    avatarUrl: null as string | null,
    email: 'mei.ling@gmail.com' as string | null,
    checkinCount: 23,
    stampCount: 8,
  };

  it('renders display name in the brown banner', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('Mei-Ling')).toBeInTheDocument();
  });

  it('renders email when provided', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('mei.ling@gmail.com')).toBeInTheDocument();
  });

  it('hides email when null', () => {
    render(<ProfileHeader {...defaultProps} email={null} />);
    expect(screen.queryByText('mei.ling@gmail.com')).not.toBeInTheDocument();
  });

  it('shows check-in count stat', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Check-ins')).toBeInTheDocument();
  });

  it('shows memories count stat', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Memories')).toBeInTheDocument();
  });

  it('shows initials when no avatar URL', () => {
    render(<ProfileHeader {...defaultProps} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('shows avatar image when URL provided', () => {
    render(
      <ProfileHeader
        {...defaultProps}
        avatarUrl="https://example.com/avatar.jpg"
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('avatar.jpg'));
  });

  it('falls back to "User" when no display name', () => {
    render(<ProfileHeader {...defaultProps} displayName={null} />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('renders an Edit Profile link to /settings', () => {
    render(<ProfileHeader {...defaultProps} />);
    const link = screen.getByRole('link', { name: /edit profile/i });
    expect(link).toHaveAttribute('href', '/settings');
  });
});
