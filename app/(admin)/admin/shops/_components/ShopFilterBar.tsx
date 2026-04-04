'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SOURCE_LABELS,
  SOURCE_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
} from '../_constants';

interface ShopFilterBarProps {
  onFilterChange: (filters: {
    search: string;
    status: string;
    source: string;
  }) => void;
  statusOptions: typeof STATUS_OPTIONS;
  sourceOptions: typeof SOURCE_OPTIONS;
  currentStatus?: string;
  currentSource?: string;
}

export function ShopFilterBar({
  onFilterChange,
  statusOptions,
  sourceOptions,
  currentStatus = 'all',
  currentSource = 'all',
}: ShopFilterBarProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(currentStatus);
  const [sourceFilter, setSourceFilter] = useState<string>(currentSource);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStatusFilter(currentStatus);
  }, [currentStatus]);

  useEffect(() => {
    setSourceFilter(currentSource);
  }, [currentSource]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ search: value, status: statusFilter, source: sourceFilter });
    }, 300);
  }

  function handleSearchKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onFilterChange({ search, status: statusFilter, source: sourceFilter });
    }
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
    onFilterChange({ search, status: value, source: sourceFilter });
  }

  function handleSourceChange(value: string) {
    setSourceFilter(value);
    onFilterChange({ search, status: statusFilter, source: value });
  }

  return (
    <div className="flex gap-4">
      <Input
        placeholder="Search shops..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        onKeyDown={handleSearchKeyDown}
        className="flex-1"
      />
      <Select value={statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sourceFilter} onValueChange={handleSourceChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sourceOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {SOURCE_LABELS[s] ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
