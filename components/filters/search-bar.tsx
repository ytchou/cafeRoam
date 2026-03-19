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
    <form role="search" onSubmit={handleSubmit} className="flex items-center px-5 h-[52px]">
      <div className="flex items-center gap-3 w-full h-[52px] rounded-[26px] bg-white px-5 border border-[var(--border-medium)] shadow-[0_4px_16px_#0000000A]">
        <Search className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent font-[family-name:var(--font-body)] text-[15px] text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] outline-none"
        />
        <button
          type="button"
          aria-label="Open filters"
          onClick={onFilterClick}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--active-dark)] text-white shrink-0"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </div>
    </form>
  );
}
