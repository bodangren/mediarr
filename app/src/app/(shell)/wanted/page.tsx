'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { useToast } from '@/components/providers/ToastProvider';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';

type WantedTypeFilter = 'movie' | 'episode' | 'all';

type WantedRow = {
  type: 'movie' | 'episode';
  id: number;
  title?: string;
  year?: number;
  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
};

type ReleaseRow = {
  indexer: string;
  title: string;
  size: number;
  seeders: number;
  quality?: string;
  age?: number;
  magnetUrl?: string;
  downloadUrl?: string;
};

function qualityStatus(quality?: string): string {
  if (!quality) {
    return 'unknown';
  }

  if (quality.includes('2160')) {
    return 'completed';
  }

  if (quality.includes('1080')) {
    return 'downloading';
  }

  return 'wanted';
}

export default function WantedPage() {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<WantedTypeFilter>('all');
  const [selectedWanted, setSelectedWanted] = useState<WantedRow | null>(null);
  const [releaseSort, setReleaseSort] = useState<'seeders' | 'size' | 'age'>('seeders');

  const wantedQuery = useApiQuery({
    queryKey: queryKeys.wantedList({
      page,
      pageSize: 25,
      type: typeFilter === 'all' ? undefined : typeFilter,
    }),
    queryFn: () =>
      api.mediaApi.listWanted({
        page,
        pageSize: 25,
        type: typeFilter === 'all' ? undefined : typeFilter,
      }) as Promise<{ items: WantedRow[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }>,
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const releaseRequest = selectedWanted
    ? {
        title:
          selectedWanted.type === 'movie'
            ? selectedWanted.title
            : `${selectedWanted.seriesTitle ?? 'Series'} S${String(selectedWanted.seasonNumber ?? 0).padStart(2, '0')}E${String(selectedWanted.episodeNumber ?? 0).padStart(2, '0')}`,
        wantedId: selectedWanted.id,
        wantedType: selectedWanted.type,
      }
    : null;

  const releasesQuery = useApiQuery({
    queryKey: queryKeys.releaseCandidates(releaseRequest ?? {}),
    queryFn: () => api.releaseApi.searchCandidates(releaseRequest ?? {}),
    enabled: Boolean(releaseRequest),
    staleTimeKind: 'list',
    isEmpty: data => data.length === 0,
  });

  const grabMutation = useMutation({
    mutationFn: (candidate: ReleaseRow) => api.releaseApi.grabRelease(candidate),
    onSuccess: () => {
      pushToast({
        title: 'Release grabbed',
        message: 'Queued for download.',
        variant: 'success',
        action: {
          label: 'Open queue',
          onClick: () => router.push('/queue'),
        },
      });

      void queryClient.invalidateQueries({ queryKey: ['torrents'] });
      void queryClient.invalidateQueries({ queryKey: ['media', 'wanted'] });
      router.push('/queue');
    },
    onError: (error: Error, candidate) => {
      pushToast({
        title: 'Grab failed',
        message: error.message,
        variant: 'error',
        action: {
          label: 'Retry',
          onClick: () => {
            grabMutation.mutate(candidate);
          },
        },
      });
    },
  });

  const wantedColumns: DataTableColumn<WantedRow>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: row => <StatusBadge status={row.type === 'movie' ? 'wanted' : 'monitored'} />,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: row => {
        if (row.type === 'movie') {
          return row.title ?? 'Unknown';
        }

        return `${row.seriesTitle ?? 'Series'} · S${row.seasonNumber ?? 0}E${row.episodeNumber ?? 0}`;
      },
    },
    {
      key: 'search',
      header: 'Search',
      render: row => (
        <button
          type="button"
          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
          onClick={() => setSelectedWanted(row)}
        >
          Search
        </button>
      ),
    },
  ];

  const sortedCandidates = [...(releasesQuery.data ?? [])].sort((left, right) => {
    if (releaseSort === 'size') {
      return right.size - left.size;
    }

    if (releaseSort === 'age') {
      return (left.age ?? 0) - (right.age ?? 0);
    }

    return right.seeders - left.seeders;
  });

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Wanted</h1>
        <p className="text-sm text-text-secondary">
          Track missing items, run manual search, and grab releases with queue handoff feedback.
        </p>
      </header>

      <div className="flex items-center gap-2 text-sm">
        <span>Filter:</span>
        {(['all', 'movie', 'episode'] as const).map(value => (
          <button
            key={value}
            type="button"
            className={`rounded-sm border px-2 py-1 ${
              typeFilter === value ? 'border-accent-primary bg-accent-primary/20' : 'border-border-subtle'
            }`}
            onClick={() => {
              setPage(1);
              setTypeFilter(value);
            }}
          >
            {value}
          </button>
        ))}
      </div>

      <QueryPanel
        isLoading={wantedQuery.isPending}
        isError={wantedQuery.isError}
        isEmpty={wantedQuery.isResolvedEmpty}
        errorMessage={wantedQuery.error?.message}
        onRetry={() => void wantedQuery.refetch()}
        emptyTitle="Nothing wanted"
        emptyBody="All monitored media currently has available files."
      >
        <DataTable
          data={wantedQuery.data?.items ?? []}
          columns={wantedColumns}
          getRowId={row => `${row.type}-${row.id}`}
          pagination={{
            page,
            totalPages: wantedQuery.data?.meta.totalPages ?? 1,
            onPrev: () => setPage(current => Math.max(1, current - 1)),
            onNext: () => setPage(current => Math.min(wantedQuery.data?.meta.totalPages ?? 1, current + 1)),
          }}
          rowActions={row => (
            <button
              type="button"
              className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
              onClick={() => setSelectedWanted(row)}
            >
              Open search
            </button>
          )}
        />
      </QueryPanel>

      {selectedWanted ? (
        <section className="space-y-3 rounded-lg border border-border-subtle bg-surface-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Release Candidates</h2>
              <p className="text-sm text-text-secondary">
                {selectedWanted.type === 'movie'
                  ? selectedWanted.title
                  : `${selectedWanted.seriesTitle ?? 'Series'} · S${selectedWanted.seasonNumber ?? 0}E${selectedWanted.episodeNumber ?? 0}`}
              </p>
            </div>

            <label className="text-sm">
              Sort by{' '}
              <select
                value={releaseSort}
                className="rounded-sm border border-border-subtle bg-surface-0 px-2 py-1"
                onChange={event => setReleaseSort(event.currentTarget.value as 'seeders' | 'size' | 'age')}
              >
                <option value="seeders">Seeders</option>
                <option value="size">Size</option>
                <option value="age">Age</option>
              </select>
            </label>
          </div>

          <QueryPanel
            isLoading={releasesQuery.isPending}
            isError={releasesQuery.isError}
            isEmpty={releasesQuery.isResolvedEmpty}
            errorMessage={releasesQuery.error?.message}
            onRetry={() => void releasesQuery.refetch()}
            emptyTitle="No candidate releases"
            emptyBody="Try broader terms or a different indexer profile."
          >
            <div className="overflow-x-auto rounded-md border border-border-subtle">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-2 text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Indexer</th>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Seeders</th>
                    <th className="px-3 py-2">Age</th>
                    <th className="px-3 py-2">Quality</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface-1">
                  {sortedCandidates.map(candidate => (
                    <tr key={`${candidate.indexer}-${candidate.title}`}>
                      <td className="px-3 py-2">{candidate.title}</td>
                      <td className="px-3 py-2">{candidate.indexer}</td>
                      <td className="px-3 py-2">{(candidate.size / (1024 * 1024 * 1024)).toFixed(1)} GB</td>
                      <td className="px-3 py-2">{candidate.seeders}</td>
                      <td className="px-3 py-2">{candidate.age ?? '-'} d</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={qualityStatus(candidate.quality)} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-sm border border-border-subtle px-2 py-1 text-xs"
                          onClick={() => grabMutation.mutate(candidate)}
                        >
                          Grab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryPanel>
        </section>
      ) : null}
    </section>
  );
}
