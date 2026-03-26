export const REJECTION_REASONS: Record<string, string> = {
  permanently_closed: '此店已永久關閉',
  not_a_cafe: '不是咖啡廳',
  duplicate: '與現有店家重複',
  outside_coverage: '不在服務範圍內',
  invalid_url: '無效的連結',
  other: '其他原因',
};

export const ADMIN_REJECTION_REASONS: { value: string; label: string }[] = [
  { value: 'permanently_closed', label: 'Permanently closed' },
  { value: 'not_a_cafe', label: 'Not a café' },
  { value: 'duplicate', label: 'Duplicate of existing shop' },
  { value: 'outside_coverage', label: 'Outside coverage area' },
  { value: 'invalid_url', label: 'Invalid URL' },
  { value: 'other', label: 'Other' },
];
