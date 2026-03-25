import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '../JsonLd';

describe('JsonLd component', () => {
  it('renders a script tag with application/ld+json type', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Test Site',
    };

    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).not.toBeNull();
    expect(JSON.parse(script!.textContent!)).toEqual(data);
  });

  it('does not render when data is null', () => {
    const { container } = render(<JsonLd data={null} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).toBeNull();
  });

  it('escapes </script> sequences to prevent XSS injection', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'CafeOrCoffeeShop',
      name: 'Café</script><script>alert(1)</script>',
    };

    const { container } = render(<JsonLd data={data} />);
    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );
    expect(script).not.toBeNull();
    expect(script!.innerHTML).not.toContain('</script>');
    expect(JSON.parse(script!.innerHTML)).toEqual(data);
  });
});
