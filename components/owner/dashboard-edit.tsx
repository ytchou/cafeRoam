'use client';
import { useState } from 'react';

interface Story {
  id?: string;
  title?: string | null;
  body?: string;
  photo_url?: string | null;
  is_published?: boolean;
}

export function DashboardEdit({
  story,
  tags,
  onSaveStory,
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
        <label className="text-sm font-medium block mb-1" htmlFor="story-body">
          店家故事
        </label>
        <textarea
          id="story-body"
          aria-label="Story"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none"
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
        <label htmlFor="is-published" className="text-sm">公開發布</label>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? '儲存中...' : saved ? 'Saved' : 'Publish'}
      </button>
    </div>
  );
}
