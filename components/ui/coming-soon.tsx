import { type ReactNode } from 'react';
import { Coffee } from 'lucide-react';

import { BODY_STYLE, HEADING_STYLE } from '@/lib/typography';

interface ComingSoonProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function ComingSoon({
  title = '即將推出',
  description = 'This feature is on its way. Check back soon.',
  action,
}: ComingSoonProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      style={BODY_STYLE}
    >
      <div className="bg-surface-warm flex flex-col items-center gap-6 rounded-2xl px-10 py-12 shadow-sm">
        <div className="bg-brand/10 flex h-16 w-16 items-center justify-center rounded-full">
          <Coffee className="text-brand h-8 w-8" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            className="text-text-primary text-2xl font-bold"
            style={HEADING_STYLE}
          >
            {title}
          </h2>
          <p className="text-text-meta max-w-xs text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {action}
      </div>
    </div>
  );
}
