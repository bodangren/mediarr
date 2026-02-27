'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { MetricCard } from '@/components/primitives/MetricCard';
import { HistoryFilters, type FilterState } from '@/components/subtitles/HistoryFilters';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import type { HistoryStats, StatsQueryParams } from '@/lib/api/subtitleHistoryApi';

const TIME_FRAMES = ['day', 'week', 'month', 'year'] as const;
const ACTIONS = ['download', 'upgrade', 'manual', 'upload'] as const;
const PROVIDERS = ['OpenSubtitles', 'Subscene', 'Addic7ed', 'Podnapisi', 'Yify'] as const;
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi', 'zh'] as const;

// Helper to convert readonly tuples to mutable arrays for component compatibility
const toMutable = <T,>(arr: readonly T[]): T[] => [...arr];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-2 p-2 shadow-elevation-2">
      <p className="text-xs font-medium text-text-primary">{payload[0]?.payload?.date}</p>
      {payload.map((entry: any) => (
        <p
          key={entry.name}
          className="text-xs text-text-secondary"
          style={{ color: entry.color }}
        >
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

interface StatsFilters {
  period: 'day' | 'week' | 'month' | 'year';
  provider?: string;
  languageCode?: string;
  action?: string;
}

export default function HistoryStatsPage() {
  const api = useMemo(() => getApiClients(), []);
  const [filters, setFilters] = useState<StatsFilters>({
    period: 'month',
  });

  const queryParams: StatsQueryParams = {
    period: filters.period,
    provider: filters.provider,
    languageCode: filters.languageCode,
    action: filters.action,
  };

  const statsQuery = useQuery({
    queryKey: queryKeys.subtitleHistoryStats(queryParams),
    queryFn: () => api.subtitleHistoryApi.getHistoryStats(queryParams),
    staleTime: 30_000,
  });

  const chartData = statsQuery.data?.downloads ?? [];

  const totalDownloads = useMemo(() => {
    if (!chartData.length) return 0;
    return chartData.reduce((sum, item) => sum + item.series + item.movies, 0);
  }, [chartData]);

  const periodDownloads = useMemo(() => {
    if (!chartData.length) return 0;
    return totalDownloads;
  }, [chartData, totalDownloads]);

  const topProvider = useMemo(() => {
    const byProvider = statsQuery.data?.byProvider ?? [];
    if (!byProvider.length) return '-';
    const top = byProvider.reduce((max, item) =>
      item.count > max.count ? item : max,
    );
    return top.provider;
  }, [statsQuery.data]);

  const topLanguage = useMemo(() => {
    const byLanguage = statsQuery.data?.byLanguage ?? [];
    if (!byLanguage.length) return '-';
    const top = byLanguage.reduce((max, item) =>
      item.count > max.count ? item : max,
    );
    return top.language;
  }, [statsQuery.data]);

  const handleFilterChange = (filterState: FilterState) => {
    setFilters({
      ...filters,
      provider: filterState.provider,
      languageCode: filterState.languageCode,
      action: filterState.action,
    });
  };

  const handleTimeFrameChange = (period: 'day' | 'week' | 'month' | 'year') => {
    setFilters({ ...filters, period });
  };

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Subtitle History Statistics</h1>
        <p className="text-sm text-text-secondary">
          Visualize subtitle download trends and patterns.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        {TIME_FRAMES.map(frame => (
          <button
            key={frame}
            type="button"
            onClick={() => handleTimeFrameChange(frame)}
            className={`rounded-sm border px-3 py-1.5 text-sm capitalize ${
              filters.period === frame
                ? 'border-accent-primary bg-accent-primary text-white'
                : 'border-border-subtle bg-surface-1 text-text-primary hover:bg-surface-2'
            }`}
          >
            {frame}
          </button>
        ))}
      </div>

      <HistoryFilters
        filters={{
          provider: filters.provider,
          languageCode: filters.languageCode,
          action: filters.action,
        }}
        onChange={handleFilterChange}
        providers={toMutable(PROVIDERS)}
        languages={toMutable(LANGUAGES)}
        actions={toMutable(ACTIONS)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Downloads"
          value={totalDownloads.toLocaleString()}
        />
        <MetricCard
          label={`This ${filters.period}`}
          value={periodDownloads.toLocaleString()}
        />
        <MetricCard label="Top Provider" value={topProvider} />
        <MetricCard label="Top Language" value={topLanguage} />
      </div>

      <QueryPanel
        isLoading={statsQuery.isLoading}
        isError={statsQuery.isError}
        isEmpty={statsQuery.data?.downloads.length === 0}
        errorMessage={statsQuery.error?.message}
        onRetry={() => void statsQuery.refetch()}
        emptyTitle="No statistics available"
        emptyBody="There is no subtitle download data to display for the selected period."
      >
        <div className="rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1">
          <h2 className="mb-4 text-lg font-semibold">Download Trends</h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  stroke="var(--border-subtle)"
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  stroke="var(--border-subtle)"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  name="Series"
                  dataKey="series"
                  fill="var(--accent-info)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Movies"
                  dataKey="movies"
                  fill="var(--accent-success)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {statsQuery.data?.byProvider.length ? (
          <div className="mt-4 rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1">
            <h2 className="mb-4 text-lg font-semibold">Top Providers</h2>
            <div className="space-y-2">
              {statsQuery.data.byProvider.slice(0, 5).map((item, index) => (
                <div
                  key={item.provider}
                  className="flex items-center gap-3"
                >
                  <span className="w-6 text-sm text-text-muted">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-text-primary">
                        {item.provider}
                      </span>
                      <span className="text-sm font-medium text-text-secondary">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2">
                      <div
                        className="h-2 rounded-full bg-accent-primary"
                        style={{
                          width: `${(item.count / periodDownloads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {statsQuery.data?.byLanguage.length ? (
          <div className="mt-4 rounded-lg border border-border-subtle bg-surface-1 p-4 shadow-elevation-1">
            <h2 className="mb-4 text-lg font-semibold">Top Languages</h2>
            <div className="space-y-2">
              {statsQuery.data.byLanguage.slice(0, 5).map((item, index) => (
                <div
                  key={item.language}
                  className="flex items-center gap-3"
                >
                  <span className="w-6 text-sm text-text-muted">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm text-text-primary">
                        {item.language}
                      </span>
                      <span className="text-sm font-medium text-text-secondary">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-2">
                      <div
                        className="h-2 rounded-full bg-accent-warning"
                        style={{
                          width: `${(item.count / periodDownloads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </QueryPanel>
    </section>
  );
}
