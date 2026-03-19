'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CommunityCardFull } from '@/components/community/community-card-full';
import { useCommunityFeed } from '@/lib/hooks/use-community-feed';
import { useLikeStatus } from '@/lib/hooks/use-like-status';
import { useAnalytics } from '@/lib/posthog/use-analytics';

export default function CommunityFeedPage() {
  const router = useRouter();
  const [cursor, setCursor] = useState<string | null>(null);
  const { notes, nextCursor, isLoading, mutate } = useCommunityFeed(cursor);
  const { likedIds: serverLikedIds } = useLikeStatus(
    notes.map((n) => n.checkinId)
  );
  // localToggles tracks explicit user overrides: true = force-liked, false = force-unliked
  const [localToggles, setLocalToggles] = useState<Map<string, boolean>>(
    new Map()
  );
  const { capture } = useAnalytics();

  const likedSet = useMemo(() => {
    const result = new Set(serverLikedIds);
    for (const [id, liked] of localToggles) {
      if (liked) result.add(id);
      else result.delete(id);
    }
    return result;
  }, [serverLikedIds, localToggles]);

  useEffect(() => {
    capture('community_feed_opened', { referrer: document.referrer });
  }, [capture]);

  const handleLikeToggle = useCallback(
    async (checkinId: string) => {
      const nowLiked = !likedSet.has(checkinId);
      setLocalToggles((prev) => new Map(prev).set(checkinId, nowLiked));

      try {
        await fetch(`/api/explore/community/${checkinId}/like`, {
          method: 'POST',
        });
        mutate();
        capture('community_note_liked', { checkin_id: checkinId });
      } catch {
        setLocalToggles((prev) => new Map(prev).set(checkinId, !nowLiked));
      }
    },
    [likedSet, mutate, capture]
  );

  return (
    <div className="min-h-screen bg-[#F5F4F1]">
      <header className="sticky top-0 z-10 bg-[#F5F4F1] px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1
              className="text-xl font-bold text-gray-900"
              style={{
                fontFamily:
                  'var(--font-bricolage), var(--font-geist-sans), sans-serif',
              }}
            >
              From the Community
            </h1>
            <p className="text-[11px] text-gray-400">
              Notes from coffee explorers in Taipei
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-2 pb-24">
        {notes.map((note) => (
          <CommunityCardFull
            key={note.checkinId}
            note={note}
            liked={likedSet.has(note.checkinId)}
            onLikeToggle={() => handleLikeToggle(note.checkinId)}
          />
        ))}

        {isLoading && (
          <div className="py-8 text-center text-sm text-gray-400">
            Loading...
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">
            Community notes coming soon
          </div>
        )}

        {nextCursor && !isLoading && (
          <button
            type="button"
            onClick={() => setCursor(nextCursor)}
            className="flex items-center justify-center gap-1 py-2 text-sm font-medium text-[#8B5E3C]"
          >
            Load more notes
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
