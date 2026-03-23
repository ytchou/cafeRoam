import { AlertCircle } from 'lucide-react';

const HEADING_STYLE = {
  fontFamily: 'var(--font-bricolage), system-ui, sans-serif',
} as const;

const BODY_STYLE = {
  fontFamily: 'var(--font-dm-sans), var(--font-noto-sans-tc), system-ui, sans-serif',
} as const;

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
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-surface-warm px-10 py-12 shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={1.5} />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            className="text-2xl font-bold tracking-tight text-text-primary"
            style={HEADING_STYLE}
          >
            {title}
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-text-meta">
            {description}
          </p>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="h-10 rounded-full bg-brand px-6 text-sm font-medium text-white transition-colors hover:bg-brand/90"
            style={BODY_STYLE}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
