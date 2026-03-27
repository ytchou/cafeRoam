import { CheckCircle } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md';
}

export function VerifiedBadge({ size = 'sm' }: VerifiedBadgeProps) {
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <span
      title="已認證店家"
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
    >
      <CheckCircle size={iconSize} aria-hidden="true" />
      已認證
    </span>
  );
}
