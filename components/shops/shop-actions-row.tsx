'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Share2 } from 'lucide-react';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useUser } from '@/lib/hooks/use-user';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import { CheckInSheet } from './check-in-sheet';
import { CheckInPopover } from './check-in-popover';
import { SavePopover } from './save-popover';
import { SharePopover } from './share-popover';
import { SaveToListSheet } from '@/components/lists/save-to-list-sheet';

interface ShopActionsRowProps {
  shopId: string;
  shopName: string;
  shareUrl: string;
}

export function ShopActionsRow({
  shopId,
  shopName,
  shareUrl,
}: ShopActionsRowProps) {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { isSaved } = useUserLists();
  const saved = isSaved(shopId);

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  function requireAuth(then: () => void) {
    if (isUserLoading) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/shops/${shopId}`)}`);
      return;
    }
    then();
  }

  const checkInBtn = (
    <button
      onClick={() => requireAuth(() => setCheckInOpen(true))}
      aria-label="Check In 打卡"
      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#2D5A27] py-3 text-sm font-semibold text-white"
    >
      📍 Check In 打卡
    </button>
  );

  const saveBtn = (
    <button
      onClick={() => requireAuth(() => setSaveOpen(true))}
      aria-label="Save"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E4E1] bg-white"
    >
      <Bookmark
        className={`h-4 w-4 ${saved ? 'fill-amber-500 text-amber-500' : 'text-[#1A1918]'}`}
      />
    </button>
  );

  const shareBtn = (
    <button
      aria-label="Share"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E4E1] bg-white"
    >
      <Share2 className="h-4 w-4 text-[#1A1918]" />
    </button>
  );

  return (
    <div className="flex items-center gap-2 px-5 py-3">
      {isDesktop ? (
        <>
          <CheckInPopover
            shopId={shopId}
            shopName={shopName}
            open={checkInOpen}
            onOpenChange={setCheckInOpen}
            trigger={checkInBtn}
          />
          <SavePopover
            shopId={shopId}
            open={saveOpen}
            onOpenChange={setSaveOpen}
            trigger={saveBtn}
          />
          <SharePopover
            shopId={shopId}
            shopName={shopName}
            shareUrl={shareUrl}
            open={shareOpen}
            onOpenChange={setShareOpen}
            trigger={shareBtn}
          />
        </>
      ) : (
        <>
          {checkInBtn}
          {saveBtn}
          <SharePopover
            shopId={shopId}
            shopName={shopName}
            shareUrl={shareUrl}
            open={shareOpen}
            onOpenChange={setShareOpen}
            trigger={shareBtn}
          />
          <CheckInSheet
            shopId={shopId}
            shopName={shopName}
            open={checkInOpen}
            onOpenChange={setCheckInOpen}
          />
          <SaveToListSheet
            shopId={shopId}
            open={saveOpen}
            onOpenChange={setSaveOpen}
          />
        </>
      )}
    </div>
  );
}
