'use client';

export const REGIONS = [
  { value: 'greater_taipei', label: 'Greater Taipei (大台北)' },
] as const;

export const STATUS_OPTIONS = [
  'all',
  'pending',
  'pending_review',
  'scraping',
  'enriching',
  'embedding',
  'publishing',
  'live',
  'failed',
  'filtered_dead_url',
  'timed_out',
] as const;

export const STATUS_LABELS: Record<string, string> = {
  all: 'All statuses',
  pending: 'Queued',
  pending_review: 'Awaiting Approval',
  scraping: 'Scraping',
  enriching: 'Enriching',
  embedding: 'Embedding',
  publishing: 'Publishing',
  live: 'Live',
  failed: 'Failed',
  filtered_dead_url: 'Dead URL',
  timed_out: 'Timed Out',
};

export const STATUS_COLORS: Record<string, string> = {
  pending_review: 'bg-blue-100 text-blue-800 border-blue-300',
  pending: 'bg-gray-100 text-gray-700 border-gray-300',
  scraping: 'bg-orange-100 text-orange-800 border-orange-300',
  enriching: 'bg-purple-100 text-purple-800 border-purple-300',
  embedding: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  publishing: 'bg-teal-100 text-teal-800 border-teal-300',
  live: 'bg-green-100 text-green-800 border-green-300',
  filtered_dead_url: 'bg-red-100 text-red-700 border-red-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  timed_out: 'bg-amber-100 text-amber-800 border-amber-300',
};

export const SOURCE_OPTIONS = [
  'all',
  'cafe_nomad',
  'manual',
  'google_takeout',
  'user_submission',
] as const;

export const SOURCE_LABELS: Record<string, string> = {
  all: 'All sources',
  cafe_nomad: 'Cafe Nomad',
  manual: 'Manual',
  google_takeout: 'Google Takeout',
  user_submission: 'User Submission',
};

export const PAGE_SIZE = 20;

export interface Shop {
  id: string;
  name: string;
  address: string;
  processing_status: string;
  source: string;
  enriched_at: string | null;
  tag_count: number;
  has_embedding: boolean;
}
