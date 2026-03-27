interface Stats {
  checkin_count_30d: number;
  follower_count: number;
  saves_count_30d: number;
  page_views_30d: number;
}

export function DashboardOverview({
  stats,
  isLoading,
}: {
  stats: Stats | undefined;
  isLoading: boolean;
}) {
  const tiles = [
    { label: '訪客數', value: stats?.page_views_30d, unit: '30天' },
    { label: '打卡', value: stats?.checkin_count_30d, unit: '30天' },
    { label: '追蹤者', value: stats?.follower_count, unit: '累計' },
    { label: '收藏', value: stats?.saves_count_30d, unit: '30天' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-card rounded-xl border p-4">
          <p className="text-muted-foreground text-xs">{tile.label}</p>
          {isLoading ? (
            <div className="bg-muted mt-1 h-7 w-16 animate-pulse rounded" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{tile.value ?? 0}</p>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">{tile.unit}</p>
        </div>
      ))}
    </div>
  );
}
