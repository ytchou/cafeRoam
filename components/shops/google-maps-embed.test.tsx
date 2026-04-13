import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GoogleMapsEmbed } from './google-maps-embed';

describe('GoogleMapsEmbed', () => {
  const defaultProps = {
    latitude: 25.0478,
    longitude: 121.517,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  it('renders iframe with Place mode when googlePlaceId provided', () => {
    render(<GoogleMapsEmbed {...defaultProps} googlePlaceId="ChIJ123abc" />);

    const iframe = screen.getByTitle('Google Maps');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('place?');
    expect(iframe.getAttribute('src')).toContain('place_id:ChIJ123abc');
  });

  it('renders iframe with View mode when no googlePlaceId', () => {
    render(<GoogleMapsEmbed {...defaultProps} />);

    const iframe = screen.getByTitle('Google Maps');
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('src')).toContain('view?');
    expect(iframe.getAttribute('src')).toContain('center=25.0478,121.517');
  });

  it('applies correct dimensions', () => {
    render(<GoogleMapsEmbed {...defaultProps} />);

    const iframe = screen.getByTitle('Google Maps');
    expect(iframe).toHaveClass('w-full');
    expect(iframe).toHaveClass('h-[200px]');
  });

  it('has no border styling', () => {
    render(<GoogleMapsEmbed {...defaultProps} />);

    const iframe = screen.getByTitle('Google Maps');
    expect(iframe).toHaveAttribute(
      'style',
      expect.stringContaining('border: 0')
    );
  });
});
