'use client';

import { useState } from 'react';

import type { TaxonomyDimension, TaxonomyTag } from '@/lib/types';

const DIMENSION_LABELS: Record<TaxonomyDimension, string> = {
  functionality: '功能性',
  ambience: '氛圍',
  mode: '使用模式',
  coffee: '咖啡',
  time: '時段',
};

const DIMENSION_ORDER: TaxonomyDimension[] = [
  'functionality',
  'ambience',
  'mode',
  'coffee',
  'time',
];

interface TagGroupProps {
  dimension: TaxonomyDimension;
  tags: TaxonomyTag[];
}

function TagGroup({ dimension, tags }: TagGroupProps) {
  const [open, setOpen] = useState(tags.length > 2);

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-primary mb-1.5 flex items-center gap-1 text-xs font-semibold"
      >
        <span>{DIMENSION_LABELS[dimension]}</span>
        <span className="text-text-body">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="bg-surface-card text-text-body rounded-full px-3 py-1 text-xs font-medium"
            >
              {tag.labelZh}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface AttributeChipsProps {
  tags: TaxonomyTag[];
}

export function AttributeChips({ tags }: AttributeChipsProps) {
  const grouped = new Map<TaxonomyDimension, TaxonomyTag[]>();

  for (const tag of tags) {
    const group = grouped.get(tag.dimension) ?? [];
    group.push(tag);
    grouped.set(tag.dimension, group);
  }

  for (const [dim, group] of grouped) {
    grouped.set(dim, [...group].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)));
  }

  const orderedDimensions = DIMENSION_ORDER.filter((d) => grouped.has(d));

  if (orderedDimensions.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <h2 className="text-text-primary mb-3 text-sm font-semibold">Tags</h2>
      {orderedDimensions.map((dimension) => (
        <TagGroup key={dimension} dimension={dimension} tags={grouped.get(dimension)!} />
      ))}
    </div>
  );
}
