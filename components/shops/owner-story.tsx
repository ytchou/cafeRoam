import Link from 'next/link';

interface Story {
  id: string;
  title: string | null;
  body: string;
  photo_url: string | null;
  is_published: boolean;
}

interface Props {
  story: Story | null;
  shopId: string;
  isOwner: boolean;
}

export function OwnerStory({ story, shopId, isOwner }: Props) {
  if (!story || !story.is_published) return null;

  return (
    <section className="px-4 py-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          From the Owner
        </h3>
        {isOwner && (
          <Link
            href={`/owner/${shopId}/dashboard`}
            className="text-xs text-primary hover:underline"
          >
            Edit your story →
          </Link>
        )}
      </div>
      {story.photo_url && (
        <img
          src={story.photo_url}
          alt="shop owner photo"
          className="w-full rounded-lg object-cover aspect-video mb-3"
        />
      )}
      {story.title && (
        <h4 className="font-medium mb-1">{story.title}</h4>
      )}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {story.body}
      </p>
    </section>
  );
}
