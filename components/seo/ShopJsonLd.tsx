import { JsonLd } from './JsonLd';
import { generateShopFaq, type ShopForFaq } from './generateShopFaq';
import { BASE_URL } from '@/lib/config';

interface ShopJsonLdProps {
  shop: ShopForFaq & {
    id: string;
    slug?: string | null;
    description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    rating?: number | null;
    reviewCount?: number;
    photoUrls?: string[];
    phone?: string | null;
    website?: string | null;
    priceRange?: string | null;
    city?: string | null;
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
        ...(shop.city && { addressLocality: shop.city }),
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
    ...(shop.openingHours &&
      Object.keys(shop.openingHours).length > 0 && {
        openingHoursSpecification: Object.entries(shop.openingHours).map(
          ([day, hours]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: `https://schema.org/${day}`,
            opens: hours.split('–')[0]?.trim(),
            closes: hours.split('–')[1]?.trim(),
          })
        ),
      }),
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
