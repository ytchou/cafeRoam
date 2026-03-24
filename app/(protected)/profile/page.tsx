'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/lib/hooks/use-user';
import { useUserStamps } from '@/lib/hooks/use-user-stamps';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserCheckins } from '@/lib/hooks/use-user-checkins';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { PolaroidSection } from '@/components/stamps/polaroid-section';
import { StampDetailSheet } from '@/components/stamps/stamp-detail-sheet';
import { ProfileHeader } from '@/components/profile/profile-header';
import { CheckinHistoryTab } from '@/components/profile/checkin-history-tab';
import type { StampData } from '@/lib/hooks/use-user-stamps';

export default function ProfilePage() {
  const { user } = useUser();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { stamps, isLoading: stampsLoading } = useUserStamps();
  const { checkins, isLoading: checkinsLoading } = useUserCheckins();
  const [selectedStamp, setSelectedStamp] = useState<StampData | null>(null);
  const { capture } = useAnalytics();
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!stampsLoading && !hasFiredRef.current) {
      hasFiredRef.current = true;
      capture('profile_stamps_viewed', { stamp_count: stamps.length });
    }
  }, [stampsLoading, stamps.length, capture]);

  return (
    <main className="min-h-screen bg-[#F5F4F1]">
      {profileLoading ? (
        <div className="flex justify-center bg-[#8B5E3C] py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      ) : (
        <ProfileHeader
          displayName={profile?.display_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          email={user?.email ?? null}
          checkinCount={profile?.checkin_count ?? 0}
          stampCount={profile?.stamp_count ?? 0}
        />
      )}

      <div className="mx-auto max-w-4xl px-4 pb-8">
        <section>
          {stampsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            </div>
          ) : (
            <PolaroidSection
              stamps={stamps}
              onStampClick={(stamp) => setSelectedStamp(stamp)}
            />
          )}
        </section>

        <section>
          <h2 className="font-heading pt-7 pb-4 text-xl font-bold text-[#1A1918]">
            Check-in History
          </h2>
          <CheckinHistoryTab checkins={checkins} isLoading={checkinsLoading} />
        </section>
      </div>

      {selectedStamp && (
        <StampDetailSheet
          stamp={selectedStamp}
          onClose={() => setSelectedStamp(null)}
        />
      )}
    </main>
  );
}
