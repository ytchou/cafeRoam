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
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-surface-warm px-10 py-12 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <Coffee className="h-8 w-8 text-brand" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={HEADING_STYLE}
          >
            {title}
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-text-meta">
            {description}
          </p>
        </div>

        {action}
      </div>
    </div>
  );
}
