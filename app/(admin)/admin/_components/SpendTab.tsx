'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SpendTask {
  task: string;
  today_usd: number;
  mtd_usd: number;
  today_calls?: number;
  mtd_calls?: number;
  today_tokens_in?: number;
  today_tokens_out?: number;
  mtd_tokens_in?: number;
  mtd_tokens_out?: number;
}

interface SpendProvider {
  provider: string;
  today_usd: number;
  mtd_usd: number;
  today_calls?: number;
  mtd_calls?: number;
  tasks: SpendTask[];
}

interface SpendResponse {
  today_total_usd: number;
  mtd_total_usd: number;
  providers: SpendProvider[];
}

interface SpendTabProps {
  getToken: () => Promise<string | null>;
}

interface SpendAmountCellProps {
  context: string;
  value: number;
}

function formatUsd(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  }

return `$${value.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
}

function SpendAmountCell({ context, value }: SpendAmountCellProps) {
  return (
    <TableCell>
      <span className="sr-only">{context} </span>
      {formatUsd(value)}
    </TableCell>
  );
}

export function SpendTab({ getToken }: SpendTabProps) {
  const [data, setData] = useState<SpendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSpend() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch('/api/admin/pipeline/spend', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          if (!cancelled) {
            setError(`HTTP ${res.status}`);
            setData(null);
          }
          return;
        }

        const payload = (await res.json()) as SpendResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setError('HTTP 500');
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSpend();

    return () => {
      cancelled = true;
    };
  }, [getToken]);

  function toggleProvider(provider: string) {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) {
        next.delete(provider);
      } else {
        next.add(provider);
      }
      return next;
    });
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!data || data.providers.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex gap-6">
          <p>Today: {formatUsd(data?.today_total_usd ?? 0)}</p>
          <p>MTD: {formatUsd(data?.mtd_total_usd ?? 0)}</p>
        </div>
        <p>No spend data yet</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-6">
        <p>Today: {formatUsd(data.today_total_usd)}</p>
        <p>MTD: {formatUsd(data.mtd_total_usd)}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Daily</TableHead>
            <TableHead>Month to Date</TableHead>
            <TableHead>Daily Calls</TableHead>
            <TableHead>Month Calls</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.providers.map((provider) => {
            const expanded = expandedProviders.has(provider.provider);

            return (
              <Fragment key={provider.provider}>
                <TableRow
                  aria-expanded={expanded}
                  onClick={() => toggleProvider(provider.provider)}
                  className="cursor-pointer"
                >
                  <TableCell>{provider.provider}</TableCell>
                  <SpendAmountCell
                    context={`${provider.provider} daily`}
                    value={provider.today_usd}
                  />
                  <SpendAmountCell
                    context={`${provider.provider} month to date`}
                    value={provider.mtd_usd}
                  />
                  <TableCell>{provider.today_calls ?? 0}</TableCell>
                  <TableCell>{provider.mtd_calls ?? 0}</TableCell>
                </TableRow>
                {expanded &&
                  provider.tasks.map((task) => (
                    <TableRow key={`${provider.provider}-${task.task}`}>
                      <TableCell className="pl-6">{task.task}</TableCell>
                      <SpendAmountCell
                        context={`${provider.provider} ${task.task} daily`}
                        value={task.today_usd}
                      />
                      <SpendAmountCell
                        context={`${provider.provider} ${task.task} month to date`}
                        value={task.mtd_usd}
                      />
                      <TableCell>{task.today_calls ?? 0}</TableCell>
                      <TableCell>{task.mtd_calls ?? 0}</TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
