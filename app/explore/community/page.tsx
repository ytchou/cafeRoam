'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CommunityCardFull } from '@/components/community/community-card-full';
import stationsData from '@/lib/data/taipei-mrt-stations.json';
import { useCommunityFeed } from '@/lib/hooks/use-community-feed';
import { useLikeStatus } from '@/lib/hooks/use-like-status';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import type { CommunityNoteCard } from '@/types/community';

const VIBE_TAGS = [
  { id: 'quiet', label: 'Quiet' },
  { id: 'laptop_friendly', label: 'Laptop friendly' },
  { id: 'specialty_coffee_focused', label: 'Good coffee' },
  { id: 'photogenic', label: 'Instagrammable' },
] as const;

export default function CommunityFeedPage() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedMrt, setSelectedMrt] = useState<string>('');
  const [selectedVibeTag, setSelectedVibeTag] = useState<string>('');
  // Tracks notes from previous pages so "Load more" accumulates instead of replaces.
  // Reset to [] when filters change; updated at click-time in handleLoadMore.
  const [prevPageNotes, setPrevPageNotes] = useState<CommunityNoteCard[]>([]);
  const { notes, nextCursor, isLoading, mutate } = useCommunityFeed({
    cursor,
    mrt: selectedMrt || null,
    vibeTag: selectedVibeTag || null,
  });
  const allNotes = [...prevPageNotes, ...notes];
  const { likedIds: serverLikedIds } = useLikeStatus(
    allNotes.map((n) => n.checkinId)
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

  const mrtStationNames = useMemo(
    () =>
      [...new Set((stationsData as Array<{ name_zh: string }>).map((s) => s.name_zh))].sort(),
    []
  );

  useEffect(() => {
    capture('community_feed_opened', { referrer: document.referrer });
  }, [capture]);

  const handleMrtChange = useCallback(
    (value: string) => {
      setPrevPageNotes([]);
      setSelectedMrt(value);
      setCursor(null);
    },
    []
  );

  const handleVibeTagToggle = useCallback(
    (id: string) => {
      setPrevPageNotes([]);
      setSelectedVibeTag((prev) => (prev === id ? '' : id));
      setCursor(null);
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setPrevPageNotes([]);
    setSelectedMrt('');
    setSelectedVibeTag('');
    setCursor(null);
  }, []);

  const handleLoadMore = useCallback(() => {
    setPrevPageNotes((prev) => [...prev, ...notes]);
    setCursor(nextCursor);
  }, [notes, nextCursor]);

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
    <div className="bg-surface-section min-h-screen">
      <header
        className={`${isDesktop ? '' : 'sticky top-0 z-10'} bg-surface-section px-5 pt-4 pb-3 lg:px-8`}
      >
        <div className="flex items-center gap-3">
          {!isDesktop && (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200"
              aria-label="Go back"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
          )}
          <div className="flex flex-col gap-0.5">
            <h1
              className="text-xl font-bold text-gray-900"
              style={{
                fontFamily:
                  'var(--font-bricolage), var(--font-geist-sans), sans-serif',
              }}
            >
              {isDesktop ? '啡遊筆記' : 'From the Community'}
            </h1>
            <p className="text-[11px] text-gray-400">
              {isDesktop
                ? 'Partner reviews from our café explorers'
                : 'Notes from coffee explorers in Taipei'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-3 lg:px-8">
        <select
          aria-label="MRT station"
          value={selectedMrt}
          onChange={(e) => handleMrtChange(e.target.value)}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:outline-none"
        >
          <option value="">All stations</option>
          {mrtStationNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {VIBE_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleVibeTagToggle(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                selectedVibeTag === tag.id
                  ? 'border-amber-700 bg-amber-700 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        {(selectedMrt || selectedVibeTag) && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-500 hover:border-gray-500"
          >
            Clear filters
          </button>
        )}
      </div>

      <div
        className={`${isDesktop ? 'grid grid-cols-2' : 'flex flex-col'} gap-4 px-5 pt-2 pb-24 lg:px-8`}
      >
        {allNotes.map((note) => (
          <CommunityCardFull
            key={note.checkinId}
            note={note}
            liked={likedSet.has(note.checkinId)}
            onLikeToggle={() => handleLikeToggle(note.checkinId)}
          />
        ))}

        {isLoading && (
          <div
            className={`${isDesktop ? 'col-span-2' : ''} py-8 text-center text-sm text-gray-400`}
          >
            Loading...
          </div>
        )}

        {!isLoading && allNotes.length === 0 && (
          <div
            className={`${isDesktop ? 'col-span-2' : ''} py-12 text-center text-sm text-gray-400`}
          >
            Community notes coming soon
          </div>
        )}

        {nextCursor && !isLoading && (
          <button
            type="button"
            onClick={handleLoadMore}
            className={`${isDesktop ? 'col-span-2' : ''} text-map-pin flex items-center justify-center gap-1 py-2 text-sm font-medium`}
          >
            Load more notes
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
