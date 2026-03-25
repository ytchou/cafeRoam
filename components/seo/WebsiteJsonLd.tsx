import { JsonLd } from './JsonLd';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://caferoam.tw';

export function WebsiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: '啡遊 CafeRoam',
        url: BASE_URL,
        description:
          "Discover Taiwan's best independent coffee shops with AI-powered semantic search.",
        inLanguage: 'zh-TW',
        potentialAction: {
          '@type': 'SearchAction',
          target: `${BASE_URL}/explore?q={search_term}`,
          'query-input': 'required name=search_term',
        },
      }}
    />
  );
}
