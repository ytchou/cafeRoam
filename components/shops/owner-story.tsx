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
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          From the Owner
        </h3>
        {isOwner && (
          <Link
            href={`/owner/${shopId}/dashboard`}
            className="text-primary text-xs hover:underline"
          >
            Edit your story →
          </Link>
        )}
      </div>
      {story.photo_url && (
        <img
          src={story.photo_url}
          alt="shop owner photo"
          className="mb-3 aspect-video w-full rounded-lg object-cover"
        />
      )}
      {story.title && <h4 className="mb-1 font-medium">{story.title}</h4>}
      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {story.body}
      </p>
    </section>
  );
}
