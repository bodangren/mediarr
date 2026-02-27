'use client';

import { useMemo } from 'react';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

interface IndexerTelemetryRow {
  id: number;
  name: string;
  protocol: string;
  enabled: boolean;
  supportsRss: boolean;
  supportsSearch: boolean;
  priority: number;
  health?: {
    failureCount?: number;
  } | null;
}

interface ChartDatum {
  key: string;
  label: string;
  value: number;
}

interface ProtocolChartDatum {
  key: string;
  label: string;
  active: number;
  inactive: number;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function MetricCard({ label, value, description }: { label: string; value: string | number; description: string }) {
  return (
    <article className="rounded-md border border-border-subtle bg-surface-1 p-4">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{description}</p>
    </article>
  );
}

function StackedBarChart({ data }: { data: ProtocolChartDatum[] }) {
  const maxTotal = data.reduce((highest, entry) => {
    const total = entry.active + entry.inactive;
    return total > highest ? total : highest;
  }, 1);

  return (
    <div className="space-y-3">
      {data.map(entry => {
        const activeWidth = Math.round((entry.active / maxTotal) * 100);
        const inactiveWidth = Math.round((entry.inactive / maxTotal) * 100);
        return (
          <div key={entry.key} data-testid={`stacked-bar-${entry.key}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-text-secondary">
              <span>{entry.label}</span>
              <span>{entry.active + entry.inactive}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-sm bg-surface-0">
              <div className="bg-status-success" style={{ width: `${activeWidth}%` }} />
              <div className="bg-status-error" style={{ width: `${inactiveWidth}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = data.reduce((highest, entry) => (entry.value > highest ? entry.value : highest), 1);

  return (
    <div className="space-y-3">
      {data.map(entry => (
        <div key={entry.key} data-testid={`bar-${entry.key}`} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>{entry.label}</span>
            <span>{entry.value}</span>
          </div>
          <div className="h-3 rounded-sm bg-surface-0">
            <div
              className="h-3 rounded-sm bg-accent-primary"
              style={{ width: `${Math.round((entry.value / maxValue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DoughnutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0) || 1;

  return (
    <ul className="space-y-2 text-sm">
      {data.map(entry => {
        const percent = Math.round((entry.value / total) * 100);
        return (
          <li
            key={entry.key}
            data-testid={`doughnut-${entry.key}`}
            className="flex items-center justify-between rounded-sm border border-border-subtle bg-surface-0 px-3 py-2"
          >
            <span className="text-text-secondary">{entry.label}</span>
            <span className="font-medium text-text-primary">
              {entry.value} ({percent}%)
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Page() {
  const api = useMemo(() => getApiClients(), []);
  const indexersQuery = useApiQuery({
    queryKey: queryKeys.indexers(),
    queryFn: () => api.indexerApi.list() as Promise<IndexerTelemetryRow[]>,
    staleTimeKind: 'list',
    isEmpty: rows => rows.length === 0,
  });

  const stats = useMemo(() => {
    const rows = indexersQuery.data ?? [];
    const total = rows.length;
    const active = rows.filter(row => row.enabled).length;
    const failed = rows.filter(row => (row.health?.failureCount ?? 0) > 0).length;
    const avgPriority = total > 0
      ? Math.round(rows.reduce((sum, row) => sum + row.priority, 0) / total)
      : 0;

    const protocolData: ProtocolChartDatum[] = ['torrent', 'usenet'].map(protocol => {
      const members = rows.filter(row => row.protocol === protocol);
      return {
        key: protocol,
        label: protocol,
        active: members.filter(row => row.enabled).length,
        inactive: members.filter(row => !row.enabled).length,
      };
    });

    const failureData: ChartDatum[] = rows.map(row => ({
      key: slugify(row.name),
      label: row.name,
      value: row.health?.failureCount ?? 0,
    }));

    const capabilityMix: ChartDatum[] = [
      {
        key: 'rss-search',
        label: 'RSS + Search',
        value: rows.filter(row => row.supportsRss && row.supportsSearch).length,
      },
      {
        key: 'rss-only',
        label: 'RSS only',
        value: rows.filter(row => row.supportsRss && !row.supportsSearch).length,
      },
      {
        key: 'search-only',
        label: 'Search only',
        value: rows.filter(row => !row.supportsRss && row.supportsSearch).length,
      },
      {
        key: 'passive',
        label: 'Passive',
        value: rows.filter(row => !row.supportsRss && !row.supportsSearch).length,
      },
    ];

    return {
      total,
      active,
      failed,
      avgPriority,
      protocolData,
      failureData,
      capabilityMix,
    };
  }, [indexersQuery.data]);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Indexer Stats</h1>
        <p className="text-sm text-text-secondary">
          Performance and reliability metrics for configured indexers.
        </p>
      </header>

      <QueryPanel
        isLoading={indexersQuery.isPending}
        isError={indexersQuery.isError}
        isEmpty={indexersQuery.isResolvedEmpty}
        errorMessage={indexersQuery.error?.message}
        onRetry={() => void indexersQuery.refetch()}
        emptyTitle="No indexer stats available"
        emptyBody="Add indexers to view performance telemetry."
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Indexers" value={stats.total} description="Configured indexers across all protocols." />
          <MetricCard label="Active Indexers" value={stats.active} description="Enabled indexers currently available for sync/search." />
          <MetricCard label="Failed Indexers" value={stats.failed} description="Indexers with one or more recent health failures." />
          <MetricCard label="Avg Priority" value={stats.avgPriority} description="Average priority weighting across configured indexers." />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-base font-semibold">Queries by Protocol</h2>
            <StackedBarChart data={stats.protocolData} />
          </article>

          <article className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-base font-semibold">Failure Rate by Indexer</h2>
            <BarChart data={stats.failureData} />
          </article>

          <article className="space-y-3 rounded-md border border-border-subtle bg-surface-1 p-4">
            <h2 className="text-base font-semibold">Capability Mix</h2>
            <DoughnutChart data={stats.capabilityMix} />
          </article>
        </section>
      </QueryPanel>
    </section>
  );
}
