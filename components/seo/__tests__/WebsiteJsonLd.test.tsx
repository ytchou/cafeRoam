import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WebsiteJsonLd } from '../WebsiteJsonLd';

describe('WebsiteJsonLd', () => {
  it('renders WebSite schema with SearchAction', () => {
    const { container } = render(<WebsiteJsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('WebSite');
    expect(data.name).toBe('啡遊 CafeRoam');
    expect(data.potentialAction['@type']).toBe('SearchAction');
    expect(data.potentialAction.target).toContain('{search_term}');
  });
});
