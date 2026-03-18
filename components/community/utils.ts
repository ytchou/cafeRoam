const MS_PER_DAY = 86_400_000;

export function getInitial(name: string): string {
  return name.replace(/[^\p{L}]/gu, '').charAt(0).toUpperCase() || '?';
}

export function formatRelativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / MS_PER_DAY);
  if (days < 1) return 'today';
  if (days === 1) return '1d ago';
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1w ago';
  return `${weeks}w ago`;
}
