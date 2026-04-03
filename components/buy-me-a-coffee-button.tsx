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
      className="text-sm text-[#9ca3af] hover:text-[#6b7280] transition-colors"
    >
      Buy me a coffee
    </a>
  );
}
