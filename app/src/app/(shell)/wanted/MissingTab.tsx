'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/components/primitives/DataTable';
import { QueryPanel } from '@/components/primitives/QueryPanel';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { Button } from '@/components/primitives/Button';
import { getApiClients } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/queryKeys';
import { useApiQuery } from '@/lib/query/useApiQuery';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers/ToastProvider';
import type { MissingEpisode } from '@/types/wanted';

export interface MissingTabProps {
  onSearchEpisode: (episode: MissingEpisode) => void;
  onBulkSearch: (episodes: MissingEpisode[]) => void;
}

export function MissingTab({ onSearchEpisode, onBulkSearch }: MissingTabProps) {
  const api = useMemo(() => getApiClients(), []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { pushToast } = useToast();

  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'airDate' | 'seriesTitle' | 'status'>('airDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedEpisodes, setSelectedEpisodes] = useState<Set<number>>(new Set());

  const missingQuery = useApiQuery({
    queryKey: queryKeys.missingEpisodes({
      page,
      pageSize: 25,
      sortBy,
      sortDir,
    }),
    queryFn: () =>
      api.mediaApi.listMissingEpisodes({
        page,
        pageSize: 25,
        sortBy,
        sortDir,
      }) as Promise<{
        items: MissingEpisode[];
        meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
      }>,
    staleTimeKind: 'list',
    isEmpty: data => data.items.length === 0,
  });

  const columns: DataTableColumn<MissingEpisode>[] = [
    {
      key: 'seriesTitle',
      header: 'Series',
      sortable: true,
      render: row => row.seriesTitle,
    },
    {
      key: 'episode',
      header: 'Episode',
      render: row => `S${String(row.seasonNumber).padStart(2, '0')}E${String(row.episodeNumber).padStart(2, '0')}`,
    },
    {
      key: 'episodeTitle',
      header: 'Title',
      render: row => row.episodeTitle,
    },
    {
      key: 'airDate',
      header: 'Air Date',
      sortable: true,
      render: row => new Date(row.airDate).toLocaleDateString(),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: row => <StatusBadge status={row.status === 'missing' ? 'wanted' : 'monitored'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: row => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedEpisodes.has(row.id)}
            onChange={e => {
              const newSelected = new Set(selectedEpisodes);
              if (e.currentTarget.checked) {
                newSelected.add(row.id);
              } else {
                newSelected.delete(row.id);
              }
              setSelectedEpisodes(newSelected);
            }}
            className="rounded-sm border-border-subtle bg-surface-1"
          />
          <Button
            variant="secondary"
            onClick={() => onSearchEpisode(row)}
            className="px-2 py-1 text-xs"
          >
            Search
          </Button>
        </div>
      ),
    },
  ];

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key as 'airDate' | 'seriesTitle' | 'status');
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleBulkSearch = () => {
    const selectedItems = missingQuery.data?.items.filter(item => selectedEpisodes.has(item.id)) ?? [];
    if (selectedItems.length > 0) {
      onBulkSearch(selectedItems);
      setSelectedEpisodes(new Set());
    }
  };

  const formatEpisodeIdentifier = (episode: MissingEpisode): string => {
    return `${episode.seriesTitle} S${String(episode.seasonNumber).padStart(2, '0')}E${String(episode.episodeNumber).padStart(2, '0')}`;
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Missing Episodes</h2>
          <p className="text-sm text-text-secondary">
            Episodes that have aired but don't have files yet.
          </p>
        </div>
        {selectedEpisodes.size > 0 && (
          <Button variant="primary" onClick={handleBulkSearch}>
            Search {selectedEpisodes.size} selected
          </Button>
        )}
      </header>

      <QueryPanel
        isLoading={missingQuery.isPending}
        isError={missingQuery.isError}
        isEmpty={missingQuery.isResolvedEmpty}
        errorMessage={missingQuery.error?.message}
        onRetry={() => void missingQuery.refetch()}
        emptyTitle="No missing episodes"
        emptyBody="All monitored episodes have been downloaded."
      >
        <DataTable
          data={missingQuery.data?.items ?? []}
          columns={columns}
          getRowId={row => row.id}
          pagination={{
            page,
            totalPages: missingQuery.data?.meta.totalPages ?? 1,
            onPrev: () => setPage(current => Math.max(1, current - 1)),
            onNext: () => setPage(current => Math.min(missingQuery.data?.meta.totalPages ?? 1, current + 1)),
          }}
          sort={{ key: sortBy, direction: sortDir }}
          onSort={handleSort}
        />
      </QueryPanel>
    </section>
  );
}
