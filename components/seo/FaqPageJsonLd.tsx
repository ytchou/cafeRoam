import { JsonLd } from './JsonLd';

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqPageJsonLdProps {
  items: FaqItem[];
}

export function FaqPageJsonLd({ items }: FaqPageJsonLdProps) {
  if (items.length === 0) return null;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }}
    />
  );
}
