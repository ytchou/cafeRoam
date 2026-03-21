'use client';
import { useState } from 'react';

interface ShopDescriptionProps {
  text: string;
}

export function ShopDescription({ text }: ShopDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className="px-5 py-4">
      <h2 className="mb-2 text-sm font-semibold text-[#1A1918]">About</h2>
      <p className={`text-sm text-[#3B2F2A] ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {!expanded && text.length > 60 && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-1 text-sm font-medium text-[#E06B3F]"
        >
          更多
        </button>
      )}
    </div>
  );
}
