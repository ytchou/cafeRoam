import { AlertCircle } from 'lucide-react';

import { BODY_STYLE, HEADING_STYLE } from '@/lib/typography';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = '出了點問題',
  description = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center"
      style={BODY_STYLE}
    >
      <div className="bg-surface-warm flex flex-col items-center gap-6 rounded-2xl px-10 py-12 shadow-sm">
        <div className="bg-destructive/10 flex h-16 w-16 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive h-8 w-8" strokeWidth={1.5} />
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

        {onRetry && (
          <Button
            size="lg"
            onClick={onRetry}
            className="bg-brand hover:bg-brand/90 rounded-full text-white"
            style={BODY_STYLE}
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
