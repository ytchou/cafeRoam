import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { OrganizationJsonLd } from '../OrganizationJsonLd';

describe('OrganizationJsonLd', () => {
  it('renders Organization schema with name, url, and description', () => {
    const { container } = render(<OrganizationJsonLd />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('Organization');
    expect(data['@context']).toBe('https://schema.org');
    expect(data.name).toBe('啡遊 CafeRoam');
    expect(data.url).toContain('caferoam');
    expect(data.description).toBeTruthy();
  });
});
