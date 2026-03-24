'use client';
import { useEffect, useState } from 'react';

interface SearchBarProps {
  onSubmit: (query: string) => void;
  defaultQuery?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  onSubmit,
  defaultQuery = '',
  autoFocus,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultQuery);

  // Sync input when URL-driven defaultQuery changes (e.g. suggestion chip navigation)
  useEffect(() => {
    setValue(defaultQuery);
  }, [defaultQuery]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className="relative flex items-center"
    >
      <span className="text-brand pointer-events-none absolute left-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          role="img"
          aria-label="search"
        >
          <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="找間有巴斯克蛋糕的咖啡廳…"
        autoFocus={autoFocus}
        className="focus:ring-brand min-h-[48px] w-full rounded-full border border-gray-200 bg-white pr-4 pl-10 text-sm focus:ring-2 focus:outline-none"
      />
    </form>
  );
}
