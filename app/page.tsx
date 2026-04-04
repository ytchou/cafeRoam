import { Suspense } from 'react';
import { DiscoveryPage } from '@/components/discovery/discovery-page';
import { WebsiteJsonLd } from '@/components/seo/WebsiteJsonLd';

export default function HomePage() {
  return (
    <>
      <WebsiteJsonLd />
      <Suspense>
        <DiscoveryPage />
      </Suspense>
    </>
  );
}
