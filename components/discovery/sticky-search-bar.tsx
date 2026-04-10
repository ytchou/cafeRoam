'use client';

import { Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

type Props = {
  defaultQuery?: string;
  onSubmit: (query: string) => void;
  onFilterClick: () => void;
};

export function StickySearchBar({
  defaultQuery = '',
  onSubmit,
  onFilterClick,
}: Props) {
  const [value, setValue] = useState(defaultQuery);

  useEffect(() => {
    setValue(defaultQuery);
  }, [defaultQuery]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <div className="sticky top-0 z-50 border-b border-black/5 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
      <form
        role="search"
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <div className="flex h-[40px] flex-1 items-center gap-2 rounded-full bg-neutral-100 px-4">
          <Search className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <input
            type="search"
            aria-label="搜尋咖啡店"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="搜尋咖啡店"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-500"
          />
        </div>
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="篩選"
          className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
