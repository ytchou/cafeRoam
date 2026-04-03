'use client';

import { useAnalytics } from '@/lib/posthog/use-analytics';

export function BuyMeACoffeeButton() {
  const { capture } = useAnalytics();

  return (
    <a
      href="https://buymeacoffee.com/ytchou"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => capture('bmc_click', { source: 'footer' })}
      className="text-sm text-[#6b7280] transition-colors hover:text-[#4b5563]"
    >
      Buy me a coffee
    </a>
  );
}
