const REASON_CODE_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  operator_cancelled: 'outline',
  retry_exhausted: 'destructive',
  bad_input: 'secondary',
  timeout: 'outline',
  dependency_failed: 'destructive',
  provider_error: 'destructive',
};

export function getReasonCodeVariant(
  code: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return REASON_CODE_VARIANT[code] ?? 'default';
}

export const REASON_CODE_OPTIONS = [
  'all',
  'operator_cancelled',
  'retry_exhausted',
  'bad_input',
  'timeout',
  'dependency_failed',
  'provider_error',
] as const;
