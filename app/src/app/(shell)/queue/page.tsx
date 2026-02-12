'use client';

import { useMemo } from 'react';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { ProgressBar } from '@/components/primitives/ProgressBar';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type QueueRow = {
  infoHash: string;
  name: string;
  status?: string;
  progress?: number;
  size: string;
  downloaded: string;
  uploaded: string;
};

interface PaginatedMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export default function QueuePage() {
  const api = useMemo(() => getApiClients(), []);

  const queueQuery = useApiQuery({
    queryKey: queryKeys.torrents({ page: 1, pageSize: 50 }),
    queryFn: () => api.torrentApi.list({ page: 1, pageSize: 50 }) as Promise<{ items: QueueRow[]; meta: PaginatedMeta }>,
    staleTimeKind: 'queue',
    isEmpty: data => data.items.length === 0,
  });

  const columns: DataTableColumn<QueueRow>[] = [
    {
      key: 'name',
      header: 'Release',
      render: row => row.name,
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status ?? 'unknown'} />,
    },
    {
      key: 'progress',
      header: 'Progress',
      render: row => <ProgressBar value={row.progress ?? 0} label="" />,
    },
  ];

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Queue</h1>
        <p className="text-sm text-text-secondary">Live torrent queue updates (full controls in Track 7D).</p>
      </header>

      <QueryPanel
        isLoading={queueQuery.isPending}
        isError={queueQuery.isError}
        isEmpty={queueQuery.isResolvedEmpty}
        errorMessage={queueQuery.error?.message}
        onRetry={() => void queueQuery.refetch()}
        emptyTitle="Queue is empty"
        emptyBody="Grab a release from Wanted to start downloading."
      >
        <DataTable data={queueQuery.data?.items ?? []} columns={columns} getRowId={row => row.infoHash} />
      </QueryPanel>
    </section>
  );
}
