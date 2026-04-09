'use client';

import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StampsTab } from '@/components/profile/stamps-tab';
import { ListsTab } from '@/components/profile/lists-tab';
import { CheckinHistoryTab } from '@/components/profile/checkin-history-tab';
import type { StampData } from '@/lib/hooks/use-user-stamps';
import type { CheckInData } from '@/lib/hooks/use-user-checkins';

export type TabValue = 'stamps' | 'lists' | 'checkins';

interface ProfileTabsProps {
  stamps: StampData[];
  stampsLoading: boolean;
  checkins: CheckInData[];
  checkinsLoading: boolean;
  defaultTab?: TabValue;
}

export function ProfileTabs({
  stamps,
  stampsLoading,
  checkins,
  checkinsLoading,
  defaultTab = 'stamps',
}: ProfileTabsProps) {
  const router = useRouter();

  function handleTabChange(value: string) {
    router.replace(`/profile?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange}>
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="stamps" className="flex-1">
          Stamps
        </TabsTrigger>
        <TabsTrigger value="lists" className="flex-1">
          Lists
        </TabsTrigger>
        <TabsTrigger value="checkins" className="flex-1">
          Check-ins
        </TabsTrigger>
      </TabsList>
      <TabsContent value="stamps">
        <StampsTab stamps={stamps} isLoading={stampsLoading} />
      </TabsContent>
      <TabsContent value="lists">
        <ListsTab />
      </TabsContent>
      <TabsContent value="checkins">
        <CheckinHistoryTab checkins={checkins} isLoading={checkinsLoading} />
      </TabsContent>
    </Tabs>
  );
}
