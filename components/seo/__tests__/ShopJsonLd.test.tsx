import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ShopJsonLd } from '../ShopJsonLd';

const shop = {
  id: 'shop-1',
  name: 'Café Flâneur',
  slug: 'cafe-flaneur',
  description: 'A quiet corner for deep work.',
  address: '台北市大安區復興南路一段219巷18號',
  latitude: 25.0339,
  longitude: 121.5436,
  mrt: '大安站',
  rating: 4.5,
  reviewCount: 42,
  photoUrls: ['https://storage.example.com/photo1.jpg'],
  phone: '+886-2-2700-1234',
  website: 'https://cafeflaneur.tw',
  openingHours: { Mon: '08:00-18:00' },
  priceRange: '$$',
  modeScores: { work: 0.85, rest: 0.6, social: 0.4 },
  taxonomyTags: [
    { id: 'quiet', dimension: 'ambience', label: 'Quiet', labelZh: '安靜' },
  ],
};

describe('ShopJsonLd', () => {
  it('renders CafeOrCoffeeShop JSON-LD with correct schema', () => {
    const { container } = render(<ShopJsonLd shop={shop} />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    // Should have 2 scripts: CafeOrCoffeeShop + FAQPage
    expect(scripts.length).toBe(2);

    const shopSchema = JSON.parse(scripts[0].textContent!);
    expect(shopSchema['@type']).toBe('CafeOrCoffeeShop');
    expect(shopSchema.name).toBe('Café Flâneur');
    expect(shopSchema.address['@type']).toBe('PostalAddress');
    expect(shopSchema.geo.latitude).toBe(25.0339);
    expect(shopSchema.aggregateRating.ratingValue).toBe(4.5);
    expect(shopSchema.telephone).toBe('+886-2-2700-1234');
    expect(shopSchema.priceRange).toBe('$$');
  });

  it('renders FAQPage JSON-LD with generated questions', () => {
    const { container } = render(<ShopJsonLd shop={shop} />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    const faqSchema = JSON.parse(scripts[1].textContent!);

    expect(faqSchema['@type']).toBe('FAQPage');
    expect(faqSchema.mainEntity.length).toBeGreaterThanOrEqual(2);
    expect(faqSchema.mainEntity[0]['@type']).toBe('Question');
  });

  it('omits optional fields when not available', () => {
    const minimalShop = {
      id: 'shop-2',
      name: 'Simple Cafe',
      slug: 'simple-cafe',
      address: '台北市信義區',
      modeScores: { work: 0.5, rest: 0.5, social: 0.5 },
      taxonomyTags: [],
    };

    const { container } = render(<ShopJsonLd shop={minimalShop} />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    const shopSchema = JSON.parse(scripts[0].textContent!);

    expect(shopSchema.telephone).toBeUndefined();
    expect(shopSchema.priceRange).toBeUndefined();
    expect(shopSchema.aggregateRating).toBeUndefined();
  });
});
