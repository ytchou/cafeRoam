import { JsonLd } from './JsonLd';
import { BASE_URL } from '@/lib/config';

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: '啡遊 CafeRoam',
        url: BASE_URL,
        description:
          '台灣獨立咖啡廳探索平台，透過 AI 語意搜尋與工作/休息/社交三種模式，幫你找到最適合的咖啡廳。',
      }}
    />
  );
}
