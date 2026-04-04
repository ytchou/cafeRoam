import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FaqPageJsonLd } from '../FaqPageJsonLd';

const FAQ_ITEMS = [
  { question: 'What is CafeRoam?', answer: 'A coffee discovery app.' },
  { question: 'Is it free?', answer: 'Yes, completely free.' },
];

describe('FaqPageJsonLd', () => {
  it('renders FAQPage schema with all questions', () => {
    const { container } = render(<FaqPageJsonLd items={FAQ_ITEMS} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent!);
    expect(data['@type']).toBe('FAQPage');
    expect(data['@context']).toBe('https://schema.org');
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]['@type']).toBe('Question');
    expect(data.mainEntity[0].name).toBe('What is CafeRoam?');
    expect(data.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('A coffee discovery app.');
  });

  it('returns null when items array is empty', () => {
    const { container } = render(<FaqPageJsonLd items={[]} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeNull();
  });
});
