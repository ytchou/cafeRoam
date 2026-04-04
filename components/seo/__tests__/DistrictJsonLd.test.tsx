import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DistrictJsonLd } from '../DistrictJsonLd';

const district = {
  id: 'dist-da-an',
  slug: 'da-an',
  nameEn: 'Da-an',
  nameZh: '大安',
  descriptionEn:
    'Da-an District is the cultural heart of Taipei, home to university cafes, tree-lined boulevards, and a dense concentration of independent coffee shops.',
  descriptionZh: '大安區是台北的文化中心，擁有大學咖啡廳、林蔭大道，以及密集的獨立咖啡館。',
  city: 'Taipei',
  shopCount: 48,
  sortOrder: 1,
};

describe('DistrictJsonLd', () => {
  it('renders CollectionPage JSON-LD with correct schema fields', () => {
    const { container } = render(<DistrictJsonLd district={district} />);
    const scripts = container.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    expect(scripts.length).toBe(1);

    const schema = JSON.parse(scripts[0].textContent!);
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('CollectionPage');
    expect(schema.name).toBe('大安 Cafes — 啡遊');
    expect(schema.url).toBe('https://caferoam.tw/explore/districts/da-an');
  });

  it('uses descriptionEn when provided', () => {
    const { container } = render(<DistrictJsonLd district={district} />);
    const schema = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );

    expect(schema.description).toBe(district.descriptionEn);
  });

  it('falls back to generated description when descriptionEn is null', () => {
    const districtWithoutDesc = { ...district, descriptionEn: null };
    const { container } = render(
      <DistrictJsonLd district={districtWithoutDesc} />
    );
    const schema = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );

    expect(schema.description).toBe(
      'Discover independent coffee shops in Da-an, Taipei.'
    );
  });

  it('renders isPartOf pointing to the CafeRoam website', () => {
    const { container } = render(<DistrictJsonLd district={district} />);
    const schema = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')!.textContent!
    );

    expect(schema.isPartOf['@type']).toBe('WebSite');
    expect(schema.isPartOf.name).toBe('啡遊 CafeRoam');
    expect(schema.isPartOf.url).toBe('https://caferoam.tw');
  });
});
