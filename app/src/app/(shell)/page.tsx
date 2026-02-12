'use client';

import { useMemo } from 'react';
import { MetricCard } from '@/components/primitives/MetricCard';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { formatNumber } from '@/lib/format';

export default function DashboardPage() {
  const api = useMemo(() => getApiClients(), []);

  const torrentsQuery = useApiQuery({
    queryKey: queryKeys.torrents({ page: 1, pageSize: 50 }),
    queryFn: () => api.torrentApi.list({ page: 1, pageSize: 50 }),
    staleTimeKind: 'queue',
    isEmpty: data => data.items.length === 0,
  });

  const healthQuery = useApiQuery({
    queryKey: queryKeys.health(),
    queryFn: () => api.healthApi.get(),
    staleTimeKind: 'detail',
  });

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Operations Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Core system metrics are available while 7E dashboard enhancements are pending.
        </p>
      </header>

      <QueryPanel
        isLoading={torrentsQuery.isPending || healthQuery.isPending}
        isError={torrentsQuery.isError || healthQuery.isError}
        isEmpty={torrentsQuery.isResolvedEmpty}
        errorMessage={torrentsQuery.error?.message ?? healthQuery.error?.message}
        onRetry={() => {
          void torrentsQuery.refetch();
          void healthQuery.refetch();
        }}
        emptyTitle="No queue activity"
        emptyBody="Grab a release from the wanted page to populate queue metrics."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Queue" value={formatNumber(torrentsQuery.data?.items.length ?? 0)} trend="flat" />
          <MetricCard
            label="Downloading"
            value={formatNumber(torrentsQuery.data?.items.filter(item => item.status === 'downloading').length ?? 0)}
            trend="up"
          />
          <MetricCard
            label="Seeding"
            value={formatNumber(torrentsQuery.data?.items.filter(item => item.status === 'seeding').length ?? 0)}
          />
          <MetricCard
            label="Indexer Health"
            value={String(healthQuery.data?.status ?? 'ok').toUpperCase()}
            trend={healthQuery.data?.status === 'critical' ? 'down' : 'flat'}
          />
        </div>
      </QueryPanel>
    </section>
  );
}
