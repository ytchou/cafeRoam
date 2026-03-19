import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MapPin } from './map-pin';

describe('a user interacting with the MapPin', () => {
  it('a user sees a map pin marker on the map', () => {
    const { container } = render(<MapPin />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('a user sees the default map pin in brown when no shop is selected', () => {
    const { container } = render(<MapPin />);
    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('fill', '#8B5E3C');
  });

  it('a user sees the active map pin highlighted in coral when a shop is selected', () => {
    const { container } = render(<MapPin active />);
    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('fill', '#FF6B6B');
  });

  it('a user sees the pin with a pointed tip indicating the shop location', () => {
    const { container } = render(<MapPin />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });
});
