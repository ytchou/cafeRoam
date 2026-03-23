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
      <h2 className="text-text-primary mb-2 text-sm font-semibold">About</h2>
      <p className={`text-text-body text-sm ${expanded ? '' : 'line-clamp-2'}`}>
        {text}
      </p>
      {!expanded && text.length > 60 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-brand mt-1 text-sm font-medium"
        >
          更多
        </button>
      )}
    </div>
  );
}
