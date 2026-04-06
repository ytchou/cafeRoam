'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Flag, Share2 } from 'lucide-react';
import { useIsDesktop } from '@/lib/hooks/use-media-query';
import { useUser } from '@/lib/hooks/use-user';
import { useUserLists } from '@/lib/hooks/use-user-lists';
import { CheckInSheet } from './check-in-sheet';
import { CheckInPopover } from './check-in-popover';
import { SavePopover } from './save-popover';
import { SharePopover } from './share-popover';
import { FollowButton } from './follow-button';
import { ReportIssueDialog } from './report-issue-dialog';
import { SaveToListSheet } from '@/components/lists/save-to-list-sheet';
import { trackSignupCtaClick } from '@/lib/analytics/ga4-events';

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
  const [reportOpen, setReportOpen] = useState(false);

  function requireAuth(then: () => void) {
    if (isUserLoading) return;
    if (!user) {
      trackSignupCtaClick('card');
      router.push(`/login?next=${encodeURIComponent(`/shops/${shopId}`)}`);
      return;
    }
    then();
  }

  const checkInBtn = (
    <button
      onClick={() => requireAuth(() => setCheckInOpen(true))}
      aria-label="Check In 打卡"
      className="bg-brand flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white"
    >
      Check In 打卡
    </button>
  );

  const saveBtn = (
    <button
      onClick={() => requireAuth(() => setSaveOpen(true))}
      aria-label="Save"
      className="border-border-warm flex h-11 w-11 items-center justify-center rounded-full border bg-white"
    >
      <Bookmark
        className={`h-4 w-4 ${saved ? 'fill-amber-500 text-amber-500' : 'text-text-primary'}`}
      />
    </button>
  );

  const shareBtn = (
    <button
      aria-label="Share"
      className="border-border-warm flex h-11 w-11 items-center justify-center rounded-full border bg-white"
    >
      <Share2 className="text-text-primary h-4 w-4" />
    </button>
  );

  const reportBtn = (
    <button
      type="button"
      onClick={() => setReportOpen(true)}
      aria-label="回報錯誤"
      className="border-border-warm text-text-primary flex items-center justify-center gap-2 rounded-full border bg-white px-4 py-3 text-sm font-semibold"
    >
      <Flag className="h-4 w-4" />
      <span>回報</span>
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
          <FollowButton
            shopId={shopId}
            isAuthenticated={!!user}
            onRequireAuth={() => requireAuth(() => {})}
          />
          {reportBtn}
          <ReportIssueDialog
            shopId={shopId}
            open={reportOpen}
            onOpenChange={setReportOpen}
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
          <FollowButton
            shopId={shopId}
            isAuthenticated={!!user}
            onRequireAuth={() => requireAuth(() => {})}
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
          {reportBtn}
          <ReportIssueDialog
            shopId={shopId}
            open={reportOpen}
            onOpenChange={setReportOpen}
          />
        </>
      )}
    </div>
  );
}
