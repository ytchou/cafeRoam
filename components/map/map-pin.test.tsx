import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MapPin } from './map-pin';

describe('MapPin', () => {
  it('renders an SVG pin', () => {
    const { container } = render(<MapPin />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses default brown color when not active', () => {
    const { container } = render(<MapPin />);
    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('fill', '#8B5E3C');
  });

  it('uses coral color when active', () => {
    const { container } = render(<MapPin active />);
    const circle = container.querySelector('circle');
    expect(circle).toHaveAttribute('fill', '#FF6B6B');
  });

  it('renders triangle tip', () => {
    const { container } = render(<MapPin />);
    expect(container.querySelector('polygon')).toBeInTheDocument();
  });
});
