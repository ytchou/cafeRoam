'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface HistoryEntry {
  date: string;
  providers: Record<string, number>;
}

interface SpendHistoryResponse {
  history: HistoryEntry[];
}

interface SpendHistoryChartProps {
  getToken: () => Promise<string | null>;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#D97706',
  openai: '#10A37F',
  apify: '#FF5C35',
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  apify: 'Apify',
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function SpendHistoryChart({ getToken }: SpendHistoryChartProps) {
  const [data, setData] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/pipeline/spend/history?days=14', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load spend history (HTTP ${res.status})`);
          return;
        }
        const payload = (await res.json()) as SpendHistoryResponse;
        if (!cancelled) setData(payload.history);
      } catch {
        if (!cancelled) setError('Failed to load spend history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [getToken]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!data || data.length === 0) return <p className="text-gray-500">No spend data for the last 14 days.</p>;

  const allProviders = Array.from(
    new Set(data.flatMap((entry) => Object.keys(entry.providers)))
  ).sort();

  const chartData = data.map((entry) => ({
    date: formatDateLabel(entry.date),
    ...entry.providers,
  }));

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Daily Spend (last 14 days)</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            tick={{ fontSize: 11 }}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [
              `$${(Number(value) || 0).toFixed(4)}`,
              PROVIDER_LABELS[String(name)] ?? String(name),
            ]}
          />
          <Legend
            formatter={(value: string) => PROVIDER_LABELS[value] ?? value}
          />
          {allProviders.map((provider) => (
            <Bar
              key={provider}
              dataKey={provider}
              stackId="a"
              fill={PROVIDER_COLORS[provider] ?? '#94A3B8'}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
