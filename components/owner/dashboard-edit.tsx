'use client';
import { useState, useEffect } from 'react';

interface Story {
  id?: string;
  title?: string | null;
  body?: string;
  photo_url?: string | null;
  is_published?: boolean;
}

export function DashboardEdit({
  story,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tags,
  onSaveStory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSaveTags,
}: {
  story: Story | null;
  tags: string[];
  onSaveStory: (data: Partial<Story>) => Promise<void>;
  onSaveTags: (tags: string[]) => Promise<void>;
}) {
  const [body, setBody] = useState(story?.body ?? '');
  const [isPublished, setIsPublished] = useState(story?.is_published ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (story) {
      setBody(story.body ?? '');
      setIsPublished(story.is_published ?? false);
    }
    // Intentional: sync only when story identity changes (first load), not on every SWR revalidation
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveStory({ body, is_published: isPublished });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="story-body">
          店家故事
        </label>
        <textarea
          id="story-body"
          aria-label="Story"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="bg-background w-full resize-none rounded-lg border px-3 py-2 text-sm"
          placeholder="分享你的故事..."
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-published"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        <label htmlFor="is-published" className="text-sm">
          公開發布
        </label>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? '儲存中...' : saved ? '已儲存' : '發布'}
      </button>
    </div>
  );
}
