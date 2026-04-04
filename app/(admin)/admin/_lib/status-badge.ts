const STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  live: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  dead_letter: 'destructive',
  draft: 'outline',
  completed: 'default',
  failed: 'destructive',
  running: 'secondary',
};

export function getStatusVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return STATUS_VARIANT[status] ?? 'outline';
}
