'use client';
import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilterClick: () => void;
  defaultQuery?: string;
  placeholder?: string;
}

export function SearchBar({
  onSearch,
  onFilterClick,
  defaultQuery = '',
  placeholder = 'Search coffee shops...',
}: SearchBarProps) {
  const [value, setValue] = useState(defaultQuery);

  useEffect(() => {
    setValue(defaultQuery);
  }, [defaultQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="flex h-[52px] items-center px-5"
    >
      <div className="flex h-[52px] w-full items-center gap-3 rounded-[26px] border border-[var(--border-medium)] bg-white px-5 shadow-[0_4px_16px_#0000000A]">
        <Search className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-[15px] text-[var(--foreground)] outline-none placeholder:text-[var(--text-tertiary)]"
        />
        <button
          type="button"
          aria-label="Open filters"
          onClick={onFilterClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--active-dark)] text-white"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>
    </form>
  );
}
