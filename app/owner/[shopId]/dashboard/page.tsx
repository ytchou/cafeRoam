'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/use-user';
import { useOwnerDashboard } from '@/lib/hooks/use-owner-dashboard';
import { useOwnerContent } from '@/lib/hooks/use-owner-content';
import { useOwnerReviews } from '@/lib/hooks/use-owner-reviews';
import { useOwnerAnalytics } from '@/lib/hooks/use-owner-analytics';
import { useOwnerAnalyticsTerms } from '@/lib/hooks/use-owner-analytics-terms';
import { DashboardOverview } from '@/components/owner/dashboard-overview';
import { DashboardEdit } from '@/components/owner/dashboard-edit';
import { DashboardReviews } from '@/components/owner/dashboard-reviews';
import { DashboardAnalytics } from '@/components/owner/dashboard-analytics';
import { AnalyticsTermsBanner } from '@/components/owner/analytics-terms-banner';

export default function OwnerDashboardPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useUser();
  const { stats, isLoading: statsLoading } = useOwnerDashboard(shopId);
  const { story, tags, saveStory, saveTags } = useOwnerContent(shopId);
  const {
    reviews,
    isLoading: reviewsLoading,
    postResponse,
  } = useOwnerReviews(shopId);
  const { data: analyticsData, isLoading: analyticsLoading } =
    useOwnerAnalytics(shopId);
  const { accepted: termsAccepted, isLoading: termsLoading, accepting, acceptTerms } =
    useOwnerAnalyticsTerms(shopId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=/owner/${shopId}/dashboard`);
    }
  }, [authLoading, user, router, shopId]);

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      {!termsLoading && !termsAccepted && (
        <AnalyticsTermsBanner onAccept={acceptTerms} accepting={accepting} />
      )}
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <h1 className="text-xl font-bold">店家管理</h1>
        <DashboardOverview stats={stats} isLoading={statsLoading} />
        <section>
          <h2 className="mb-3 text-base font-semibold">搜尋與社群洞察</h2>
          <DashboardAnalytics data={analyticsData} isLoading={analyticsLoading} />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">編輯店家資訊</h2>
          <DashboardEdit
            story={story}
            tags={tags}
            onSaveStory={saveStory}
            onSaveTags={saveTags}
          />
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">顧客評論</h2>
          <DashboardReviews
            reviews={reviews}
            isLoading={reviewsLoading}
            onPostResponse={postResponse}
          />
        </section>
      </main>
    </>
  );
}
