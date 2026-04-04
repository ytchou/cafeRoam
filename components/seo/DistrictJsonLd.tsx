import { JsonLd } from './JsonLd';
import { BASE_URL } from '@/lib/config';
import type { District } from '@/types/districts';

interface DistrictJsonLdProps {
  district: District;
}

export function DistrictJsonLd({ district }: DistrictJsonLdProps) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${district.nameZh} Cafes — 啡遊`,
    description:
      district.descriptionEn ??
      `Discover independent coffee shops in ${district.nameEn}, Taipei.`,
    url: `${BASE_URL}/explore/districts/${district.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: '啡遊 CafeRoam',
      url: BASE_URL,
    },
  };

  return <JsonLd data={data} />;
}
