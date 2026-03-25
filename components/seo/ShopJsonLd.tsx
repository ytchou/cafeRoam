import { JsonLd } from './JsonLd';
import { generateShopFaq } from './generateShopFaq';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://caferoam.tw';

interface ShopJsonLdProps {
  shop: {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    mrt?: string | null;
    rating?: number | null;
    reviewCount?: number;
    photoUrls?: string[];
    phone?: string | null;
    website?: string | null;
    openingHours?: Record<string, string> | null;
    priceRange?: string | null;
    modeScores?: { work?: number | null; rest?: number | null; social?: number | null } | null;
    taxonomyTags?: Array<{
      id: string;
      dimension: string;
      label: string;
      labelZh: string;
    }>;
  };
}

export function ShopJsonLd({ shop }: ShopJsonLdProps) {
  const url = `${BASE_URL}/shops/${shop.id}/${shop.slug ?? shop.id}`;
  const image = shop.photoUrls?.[0];

  const shopData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CafeOrCoffeeShop',
    name: shop.name,
    url,
    ...(shop.description && { description: shop.description }),
    ...(shop.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: shop.address,
        addressCountry: 'TW',
      },
    }),
    ...(shop.latitude != null &&
      shop.longitude != null && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: shop.latitude,
          longitude: shop.longitude,
        },
      }),
    ...(shop.rating != null &&
      shop.reviewCount != null &&
      shop.reviewCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: shop.rating,
          reviewCount: shop.reviewCount,
        },
      }),
    ...(image && { image }),
    ...(shop.phone && { telephone: shop.phone }),
    ...(shop.website && { sameAs: shop.website }),
    ...(shop.priceRange && { priceRange: shop.priceRange }),
  };

  // Generate FAQ from taxonomy data
  const faqEntries = generateShopFaq(shop);
  const faqData =
    faqEntries.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqEntries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: entry.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <JsonLd data={shopData} />
      <JsonLd data={faqData} />
    </>
  );
}
