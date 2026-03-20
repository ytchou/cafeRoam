import type { TaxonomyTag } from '@/lib/types';

interface AttributeChipsProps {
  tags: TaxonomyTag[];
}

export function AttributeChips({ tags }: AttributeChipsProps) {
  return (
    <div className="px-5 py-4">
      <h2 className="mb-2 text-sm font-semibold text-[#1A1918]">Tags</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-[#F0EDE8] px-3 py-1 text-xs font-medium text-[#3B2F2A]"
          >
            {tag.labelZh}
          </span>
        ))}
      </div>
    </div>
  );
}
