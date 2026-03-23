import type { TaxonomyTag } from '@/lib/types';

interface AttributeChipsProps {
  tags: TaxonomyTag[];
}

export function AttributeChips({ tags }: AttributeChipsProps) {
  return (
    <div className="px-5 py-4">
      <h2 className="text-text-primary mb-2 text-sm font-semibold">Tags</h2>
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
    </div>
  );
}
