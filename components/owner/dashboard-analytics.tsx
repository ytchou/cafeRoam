'use client';

interface AnalyticsData {
  search_insights: Array<{ query: string; impressions: number }>;
  community_pulse: Array<{ tag: string; count: number }>;
  district_rankings: Array<{
    attribute: string;
    rank: number;
    total_in_district: number;
  }>;
}

export function DashboardAnalytics({
  data,
  isLoading,
}: {
  data: AnalyticsData | undefined;
  isLoading: boolean;
}) {
  if (isLoading)
    return <div className="bg-muted h-32 animate-pulse rounded-xl" />;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.search_insights.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">搜尋曝光</h3>
          <ul className="space-y-1">
            {data.search_insights.map((item) => (
              <li key={item.query} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.query}</span>
                <span className="font-medium">{item.impressions}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.community_pulse.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">社群反饋</h3>
          <div className="flex flex-wrap gap-2">
            {data.community_pulse.map((item) => (
              <span
                key={item.tag}
                className="bg-muted rounded-full px-2 py-1 text-xs"
              >
                {item.tag} · {item.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
