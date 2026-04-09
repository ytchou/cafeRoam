'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/hooks/use-user';
import { useUserStamps } from '@/lib/hooks/use-user-stamps';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserCheckins } from '@/lib/hooks/use-user-checkins';
import { useUserFollowing } from '@/lib/hooks/use-user-following';
import { useAnalytics } from '@/lib/posthog/use-analytics';
import { ProfileHeader } from '@/components/profile/profile-header';
import { FollowingSection } from '@/components/profile/following-section';
import { ProfileTabs } from '@/components/profile/profile-tabs';
import type { TabValue } from '@/components/profile/profile-tabs';

function ProfilePageInner() {
  const { user } = useUser();
  const { profile, isLoading: profileLoading } = useUserProfile();
  const { stamps, isLoading: stampsLoading } = useUserStamps();
  const { checkins, isLoading: checkinsLoading } = useUserCheckins();
  const {
    shops: followingShops,
    total: followingTotal,
    isLoading: followingLoading,
  } = useUserFollowing();
  const searchParams = useSearchParams();
  const { capture } = useAnalytics();
  const hasFiredRef = useRef(false);

  const rawTab = searchParams?.get('tab');
  const defaultTab: TabValue =
    rawTab === 'lists' || rawTab === 'checkins' ? rawTab : 'stamps';

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
          followingCount={followingTotal}
        />
      )}

      <div className="mx-auto max-w-4xl px-4 pb-8">
        <section>
          <h2 className="font-heading pt-7 pb-4 text-xl font-bold text-[#1A1918]">
            Following
          </h2>
          <FollowingSection
            shops={followingShops}
            isLoading={followingLoading}
          />
        </section>

        <div className="pt-6">
          <ProfileTabs
            stamps={stamps}
            stampsLoading={stampsLoading}
            checkins={checkins}
            checkinsLoading={checkinsLoading}
            defaultTab={defaultTab}
          />
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfilePageInner />
    </Suspense>
  );
}
